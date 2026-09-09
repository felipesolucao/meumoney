// ============================================================================
// PÁGINA: Início (visão geral)
// ----------------------------------------------------------------------------
// Antes esta rota era o painel de empréstimos — esse conteúdo virou a aba
// "Empréstimos" (ver app/emprestimos/page.tsx). Esta nova "Início" é o
// dashboard geral pedido: junta os dois módulos do app (Financeiro pessoal e
// Empréstimos) numa única tela, com saldo financeiro, saldo de empréstimos,
// recebíveis/pendências dos dois módulos e as últimas movimentações.
//
// A conta em si (somas, filtros, o merge das movimentações) mora em
// lib/resumoGeral.ts — esta página só busca os dados e desenha o layout.
// ============================================================================
import Link from "next/link";
import { prisma } from "../lib/prisma";
import { exigirSessao } from "../lib/auth";
import { formatarMoeda } from "../lib/calculos";
import { calcularResumoGeral } from "../lib/resumoGeral";
import { tonCss } from "../lib/estiloCard";
import HeaderTopo from "../components/HeaderTopo";
import { CarteiraProvider } from "../components/CarteiraContext";
import CarteirasInicio from "../components/CarteirasInicio";
import DespesasPorCategoriaInicio from "../components/DespesasPorCategoriaInicio";
import MovimentacoesRecentesInicio from "../components/MovimentacoesRecentesInicio";
import {
  IconTrendUp,
  IconTrendDown,
  IconAlert,
  IconReceipt,
} from "../components/Icons";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const sessao = await exigirSessao();

  const [contratos, lancamentos] = await Promise.all([
    prisma.contrato.findMany({
      where: { usuarioId: sessao.id },
      include: { cliente: true, parcelas: true },
    }),
    prisma.lancamento.findMany({ where: { usuarioId: sessao.id } }),
  ]);

  const resumo = calcularResumoGeral(contratos, lancamentos);

  return (
    <div>
      <div className="header-gradient">
        <HeaderTopo nome={sessao.nome} />
      </div>

      {/* CarteiraProvider compartilha "qual carteira está selecionada" entre
          CarteirasInicio (dono do seletor), DespesasPorCategoriaInicio e
          MovimentacoesRecentesInicio, mesmo essas três não sendo pai/filho
          diretos aqui — ver components/CarteiraContext.tsx. */}
      <CarteiraProvider>
        <div className="home-dashboard px-5 mt-5 space-y-5">
          {/* Carteiras + resumo do mês — "Geral" soma tudo; as demais filtram
              as contas vinculadas a cada carteira. */}
          <CarteirasInicio />

          {/* Despesas por categoria — versão compacta do relatório completo,
              que continua em /financeiro/relatorios. */}
          <DespesasPorCategoriaInicio />

          {/* Recebíveis e pendências — geral, juntando os dois módulos (não
              filtra por carteira: contratos não pertencem a uma carteira). */}
          <div className="home-pending">
            <p className="text-xs font-semibold tracking-wide text-muted mb-3">RECEBÍVEIS E PENDÊNCIAS</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/financeiro/receber" className="card stat-card" style={tonCss("var(--color-primary)", "var(--color-primary-subtle)")}>
                <div className="stat-icon">
                  <IconTrendUp size={18} />
                </div>
                <p className="text-[11px] font-semibold tracking-wide text-muted">A RECEBER (FINANCEIRO)</p>
                <p className="font-extrabold mt-1">{formatarMoeda(resumo.aReceberFinanceiro)}</p>
              </Link>

              <Link href="/financeiro/pagar" className="card stat-card" style={tonCss("var(--color-error)", "var(--color-error-subtle)")}>
                <div className="stat-icon">
                  <IconTrendDown size={18} />
                </div>
                <p className="text-[11px] font-semibold tracking-wide text-muted">A PAGAR (FINANCEIRO)</p>
                <p className="font-extrabold mt-1">{formatarMoeda(resumo.aPagarFinanceiro)}</p>
              </Link>

              <Link href="/contratos" className="card stat-card" style={tonCss("var(--color-warning)", "var(--color-warning-subtle)")}>
                <div className="stat-icon">
                  <IconReceipt size={18} />
                </div>
                <p className="text-[11px] font-semibold tracking-wide text-muted">A RECEBER (CONTRATOS)</p>
                <p className="font-extrabold mt-1">{formatarMoeda(resumo.aReceberEmprestimos)}</p>
              </Link>

              <div
                className="card stat-card"
                style={tonCss(
                  resumo.totalAtrasados > 0 ? "var(--color-error)" : "var(--color-muted)",
                  resumo.totalAtrasados > 0 ? "var(--color-error-subtle)" : "var(--color-muted-surface)"
                )}
              >
                <div className="stat-icon">
                  <IconAlert size={18} />
                </div>
                <p className="text-[11px] font-semibold tracking-wide text-muted">EM ATRASO (GERAL)</p>
                <p className="font-extrabold mt-1">{resumo.totalAtrasados}</p>
              </div>
            </div>
          </div>

          {/* Movimentações recentes — client-side pra respeitar a carteira
              selecionada acima (ver components/MovimentacoesRecentesInicio.tsx) */}
          <MovimentacoesRecentesInicio />
        </div>
      </CarteiraProvider>
    </div>
  );
}
