// ============================================================================
// LÓGICA DE NEGÓCIO — resumo geral da tela Início
// ----------------------------------------------------------------------------
// Junta os dois módulos do app (Financeiro pessoal e Empréstimos) num único
// objeto de resumo, igual ao padrão já usado em lib/calculos.ts e
// lib/financeiro.ts para os cálculos de cada módulo isoladamente.
//
// Fica em lib/ (e não dentro de app/page.tsx) pelo mesmo motivo dos outros
// arquivos desta pasta: mantém a página focada em layout/JSX e deixa a conta
// testável isoladamente, sem precisar renderizar nada.
// ============================================================================
import { statusEfetivoLancamento } from "./financeiro";

// Só os campos que este cálculo realmente lê — evita acoplar este arquivo ao
// tipo exato gerado pelo Prisma (Contrato/Parcela/Lancamento continuam
// estruturalmente compatíveis, então funciona normalmente com o retorno real
// do prisma.contrato.findMany / prisma.lancamento.findMany).
interface ParcelaResumo {
  id: string;
  numero: number;
  valor: unknown;
  valorPago: unknown;
  status: string;
  pagoEm: Date | null;
  cliente: { nome: string };
}

interface ContratoResumo {
  valorEmprestado: unknown;
  parcelas: Omit<ParcelaResumo, "cliente">[];
  cliente: { nome: string };
}

interface LancamentoResumo {
  id: string;
  descricao: string;
  valor: unknown;
  valorPago: unknown;
  tipo: "receita" | "despesa";
  status: "pendente" | "pago";
  dataVencimento: Date;
  dataPagamento: Date | null;
}

export type Movimentacao = {
  id: string;
  data: Date;
  descricao: string;
  valor: number;
  entrada: boolean; // true = dinheiro entrando (receita / parcela recebida)
};

export interface ResumoGeral {
  totalEmprestado: number;
  recebidoEmprestimos: number;
  aReceberEmprestimos: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoFinanceiro: number;
  aReceberFinanceiro: number;
  aPagarFinanceiro: number;
  totalAtrasados: number;
  movimentacoes: Movimentacao[];
}

export function calcularResumoGeral(
  contratos: ContratoResumo[],
  lancamentos: LancamentoResumo[]
): ResumoGeral {
  const todasParcelas: ParcelaResumo[] = contratos.flatMap((c) =>
    c.parcelas.map((p) => ({ ...p, cliente: c.cliente }))
  );

  // --- Saldo de empréstimos --------------------------------------------------
  const totalEmprestado = contratos.reduce((s, c) => s + Number(c.valorEmprestado), 0);
  const recebidoEmprestimos = todasParcelas
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0);
  const aReceberEmprestimos = todasParcelas
    .filter((p) => p.status !== "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  // --- Saldo financeiro (geral, não só do mês) -------------------------------
  const receitasPagas = lancamentos.filter((l) => l.tipo === "receita" && l.status === "pago");
  const despesasPagas = lancamentos.filter((l) => l.tipo === "despesa" && l.status === "pago");
  const totalReceitas = receitasPagas.reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesas = despesasPagas.reduce((s, l) => s + Number(l.valor), 0);

  // --- Pendências dos dois módulos ------------------------------------------
  const aReceberFinanceiro = lancamentos
    .filter((l) => l.tipo === "receita" && l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor), 0);
  const aPagarFinanceiro = lancamentos
    .filter((l) => l.tipo === "despesa" && l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor), 0);

  const atrasadosFinanceiro = lancamentos.filter(
    (l) => l.status === "pendente" && statusEfetivoLancamento(l.status, l.dataVencimento) === "atrasado"
  ).length;
  const atrasadosEmprestimos = todasParcelas.filter((p) => p.status === "atrasado").length;

  // --- Últimas movimentações (une os dois módulos por data) ------------------
  const movimentacoes: Movimentacao[] = [
    ...receitasPagas.map((l) => ({
      id: `lanc-${l.id}`,
      data: l.dataPagamento ?? l.dataVencimento,
      descricao: l.descricao,
      valor: Number(l.valorPago ?? l.valor),
      entrada: true,
    })),
    ...despesasPagas.map((l) => ({
      id: `lanc-${l.id}`,
      data: l.dataPagamento ?? l.dataVencimento,
      descricao: l.descricao,
      valor: Number(l.valorPago ?? l.valor),
      entrada: false,
    })),
    ...todasParcelas
      .filter((p) => p.status === "pago" && p.pagoEm)
      .map((p) => ({
        id: `parcela-${p.id}`,
        data: p.pagoEm as Date,
        descricao: `Parcela ${p.numero} · ${p.cliente.nome}`,
        valor: Number(p.valorPago ?? p.valor),
        entrada: true,
      })),
  ]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  return {
    totalEmprestado,
    recebidoEmprestimos,
    aReceberEmprestimos,
    totalReceitas,
    totalDespesas,
    saldoFinanceiro: totalReceitas - totalDespesas,
    aReceberFinanceiro,
    aPagarFinanceiro,
    totalAtrasados: atrasadosFinanceiro + atrasadosEmprestimos,
    movimentacoes,
  };
}
