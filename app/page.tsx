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
import CarteirasInicio from "../components/CarteirasInicio";
import DespesasPorCategoriaInicio from "../components/DespesasPorCategoriaInicio";
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

      <div className="px-5 mt-5 space-y-5">
        {/* Carteiras + resumo do mês — "Geral" soma tudo; as demais filtram
            as contas vinculadas a cada carteira. */}
        <CarteirasInicio />

        {/* Despesas por categoria — versão compacta do relatório completo,
            que continua em /financeiro/relatorios. */}
        <DespesasPorCategoriaInicio />

        {/* Recebíveis e pendências — geral, juntando os dois módulos */}
        <div>
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

            <Link href="/emprestimos" className="card stat-card" style={tonCss("var(--color-warning)", "var(--color-warning-subtle)")}>
              <div className="stat-icon">
                <IconReceipt size={18} />
              </div>
              <p className="text-[11px] font-semibold tracking-wide text-muted">A RECEBER (EMPRÉSTIMOS)</p>
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

        {/* Todas as movimentações — financeiro + empréstimos, por data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-wide text-muted">MOVIMENTAÇÕES RECENTES</p>
            <Link href="/historico" className="text-primary text-sm font-semibold">
              Ver tudo
            </Link>
          </div>

          <div className="space-y-3">
            {resumo.movimentacoes.length === 0 && (
              <div className="card text-center text-muted text-sm">Nenhuma movimentação registrada ainda.</div>
            )}
            {resumo.movimentacoes.map((m) => (
              <div key={m.id} className="card flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: m.entrada ? "var(--color-success-subtle)" : "var(--color-error-subtle)",
                    color: m.entrada ? "var(--color-success)" : "var(--color-error)",
                  }}
                >
                  {m.entrada ? <IconTrendUp size={18} /> : <IconTrendDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{m.descricao}</p>
                  <p className="text-xs text-muted">{new Date(m.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
                </div>
                <p className="font-bold flex-shrink-0" style={{ color: m.entrada ? "var(--color-success)" : "var(--color-error)" }}>
                  {m.entrada ? "+" : "−"} {formatarMoeda(m.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
