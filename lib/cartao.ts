// ============================================================================
// LÓGICA DE NEGÓCIO — Cartões de crédito e faturas
// ----------------------------------------------------------------------------
// Um Cartão de Crédito NÃO debita a Conta na hora da compra — as compras
// (CompraCartao) só se acumulam numa Fatura (FaturaCartao) daquele ciclo.
// Quando a fatura FECHA (a data de fechamento chega), o sistema cria
// automaticamente UM Lancamento (despesa) com o valor total da fatura,
// vinculado à Conta que paga o cartão — é esse Lancamento que aparece em
// "Contas a pagar", entra na soma do mês em /api/financeiro/resumo, e que,
// quando marcado como pago, desconta o saldo da Conta (tudo isso de graça,
// reaproveitando o sistema de Lancamento que já existe, sem tocar nele).
//
// Como não existe nenhum processo rodando em segundo plano neste app (só
// funções serverless disparadas por requisição), o "fechamento" da fatura é
// preguiçoso: fecharFaturasVencidas() roda no início das rotas que listam
// cartões/lançamentos/resumo e fecha qualquer fatura cuja data de fechamento
// já passou — na prática, o usuário nunca percebe que não existe um cron.
// ============================================================================
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { registrarAcao } from "./historico";

export type StatusFatura = "aberta" | "fechada" | "paga";

type PrismaOuTx = PrismaClient | Prisma.TransactionClient;

// ----------------------------------------------------------------------------
// Último dia válido de um mês (protege dia de fechamento/vencimento = 29/30/31
// em meses menores — ex: fechamento cadastrado como dia 31 em fevereiro vira
// dia 28 ou 29, o último dia real daquele mês).
// ----------------------------------------------------------------------------
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

function clampDia(dia: number, ano: number, mes: number): number {
  return Math.min(Math.max(dia, 1), ultimoDiaDoMes(ano, mes));
}

// ----------------------------------------------------------------------------
// Em qual competência (ano/mês da FATURA, não da compra) uma compra cai.
// Regra: compra até o dia de fechamento (inclusive) entra na fatura que
// fecha NESTE mês; compra depois do fechamento entra na fatura do mês
// seguinte. "mes" segue o padrão 0-11 do resto do app (Date.getMonth()).
// ----------------------------------------------------------------------------
export function competenciaDaCompra(dataCompra: Date, diaFechamento: number): { ano: number; mes: number } {
  let ano = dataCompra.getFullYear();
  let mes = dataCompra.getMonth();
  if (dataCompra.getDate() > diaFechamento) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return { ano, mes };
}

// ----------------------------------------------------------------------------
// Data de vencimento de uma fatura, a partir da competência (ano/mês em que
// ELA FECHA) — se o dia de vencimento cadastrado for menor ou igual ao dia
// de fechamento, o vencimento cai no mês SEGUINTE (caso mais comum: fecha
// dia 25, vence dia 05); se for maior, vence no mesmo mês do fechamento
// (cartões que fecham cedo e vencem no fim do mesmo mês).
// ----------------------------------------------------------------------------
function calcularDataVencimento(ano: number, mes: number, diaFechamento: number, diaVencimento: number): Date {
  let anoV = ano;
  let mesV = mes;
  if (diaVencimento <= diaFechamento) {
    mesV += 1;
    if (mesV > 11) {
      mesV = 0;
      anoV += 1;
    }
  }
  return new Date(anoV, mesV, clampDia(diaVencimento, anoV, mesV));
}

function nomeCompetencia(ano: number, mes: number): string {
  const nome = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

// ----------------------------------------------------------------------------
// Busca a fatura de uma competência específica de um cartão — cria se ainda
// não existir (primeira compra do ciclo, ou o usuário abrindo o extrato de
// um mês em que ainda não comprou nada, futuro ou passado).
// ----------------------------------------------------------------------------
export async function obterOuCriarFatura(
  db: PrismaOuTx,
  cartao: { id: string; diaFechamento: number; diaVencimento: number },
  ano: number,
  mes: number
) {
  const existente = await db.faturaCartao.findUnique({
    where: { cartaoId_anoReferencia_mesReferencia: { cartaoId: cartao.id, anoReferencia: ano, mesReferencia: mes } },
  });
  if (existente) return existente;

  const dataFechamento = new Date(ano, mes, clampDia(cartao.diaFechamento, ano, mes));
  const dataVencimento = calcularDataVencimento(ano, mes, cartao.diaFechamento, cartao.diaVencimento);

  return db.faturaCartao.create({
    data: {
      cartaoId: cartao.id,
      anoReferencia: ano,
      mesReferencia: mes,
      dataFechamento,
      dataVencimento,
      valorTotal: 0,
      status: "aberta",
    },
  });
}

// ----------------------------------------------------------------------------
// Registra uma compra no cartão: acha/cria a fatura do ciclo certo (a partir
// da data da compra) e soma o valor nela. Recusa se a fatura daquele ciclo
// já tiver fechado (ex: usuário tenta lançar, hoje, uma compra com data de
// um mês cuja fatura já virou Lancamento) — nesse caso, oriente a lançar como
// uma despesa avulsa normal em /financeiro/novo.
// ----------------------------------------------------------------------------
export async function registrarCompraCartao(params: {
  usuarioId: string;
  cartaoId: string;
  descricao: string;
  valor: number;
  dataCompra: Date;
  categoriaId?: string;
  observacoes?: string;
}) {
  const cartao = await prisma.cartaoCredito.findFirst({
    where: { id: params.cartaoId, usuarioId: params.usuarioId },
  });
  if (!cartao) return { ok: false as const, erro: "Cartão não encontrado." };

  const { ano, mes } = competenciaDaCompra(params.dataCompra, cartao.diaFechamento);

  return prisma.$transaction(async (tx) => {
    const fatura = await obterOuCriarFatura(tx, cartao, ano, mes);
    if (fatura.status !== "aberta") {
      return {
        ok: false as const,
        erro: "A fatura deste período já fechou. Lance esta compra como uma despesa avulsa em vez de compra no cartão.",
      };
    }

    const compra = await tx.compraCartao.create({
      data: {
        descricao: params.descricao,
        valor: params.valor,
        dataCompra: params.dataCompra,
        cartaoId: cartao.id,
        faturaId: fatura.id,
        categoriaId: params.categoriaId || undefined,
        observacoes: params.observacoes || undefined,
        usuarioId: params.usuarioId,
      },
    });

    await tx.faturaCartao.update({
      where: { id: fatura.id },
      data: { valorTotal: { increment: params.valor } },
    });

    return { ok: true as const, compra };
  });
}

// ----------------------------------------------------------------------------
// Fecha toda fatura "aberta" cuja data de fechamento já passou: gera o
// Lancamento consolidado (se houve alguma compra) vinculado à Conta que paga
// o cartão, e marca a fatura como "fechada". Chamada no início das rotas que
// listam cartões/lançamentos/resumo — ver comentário no topo do arquivo.
// Idempotente: rodar de novo sobre uma fatura já fechada não faz nada, já
// que o filtro é sempre "status: aberta".
// ----------------------------------------------------------------------------
export async function fecharFaturasVencidas(usuarioId: string) {
  const hoje = new Date();
  const vencidas = await prisma.faturaCartao.findMany({
    where: { status: "aberta", dataFechamento: { lte: hoje }, cartao: { usuarioId } },
    include: { cartao: true },
  });

  for (const fatura of vencidas) {
    await prisma.$transaction(async (tx) => {
      const valor = Number(fatura.valorTotal);
      let lancamentoId: string | null = null;

      // Fatura sem nenhuma compra (valor 0) não precisa virar um Lancamento
      // de R$ 0,00 em "Contas a pagar" — só fecha o ciclo.
      if (valor > 0) {
        const lancamento = await tx.lancamento.create({
          data: {
            descricao: `Fatura ${fatura.cartao.nome} — ${nomeCompetencia(fatura.anoReferencia, fatura.mesReferencia)}`,
            valor,
            tipo: "despesa",
            origem: fatura.cartao.origem,
            status: "pendente",
            dataVencimento: fatura.dataVencimento,
            contaId: fatura.cartao.contaId,
            usuarioId,
          },
        });
        lancamentoId = lancamento.id;

        // Mesmo registrarAcao usado por qualquer Lancamento criado no app —
        // a fatura ganha histórico e "desfazer" de graça (ver lib/historico.ts).
        await registrarAcao(tx, {
          usuarioId,
          tipo: "FATURA_CARTAO_FECHADA",
          entidade: "Lancamento",
          entidadeId: lancamento.id,
          descricao: `Fatura fechada: ${fatura.cartao.nome}`,
          valor: valor * -1,
          dadosDepois: lancamento,
        });
      }

      await tx.faturaCartao.update({
        where: { id: fatura.id },
        data: { status: "fechada", lancamentoId },
      });
    });
  }
}
