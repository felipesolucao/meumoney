// ============================================================================
// PÁGINA: Financeiro (painel de controle financeiro pessoal e empresarial)
// ----------------------------------------------------------------------------
// Mostra o balanço do mês (receitas x despesas), quanto está pendente para
// pagar e para receber, e atalhos para o histórico e o cadastro de novos
// lançamentos. Independente do módulo de Contratos/Parcelas de empréstimos.
// ============================================================================
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { formatarMoeda, statusEfetivoLancamento } from "../../lib/financeiro";

export const dynamic = "force-dynamic";

export default async function Financeiro() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  const [lancamentosDoMes, pendentesDespesa, pendentesReceita] = await Promise.all([
    prisma.lancamento.findMany({ where: { dataVencimento: { gte: inicioMes, lte: fimMes } } }),
    prisma.lancamento.findMany({ where: { tipo: "despesa", status: "pendente" } }),
    prisma.lancamento.findMany({ where: { tipo: "receita", status: "pendente" } }),
  ]);

  const receitasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "receita" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const despesasDoMes = lancamentosDoMes
    .filter((l) => l.tipo === "despesa" && l.status === "pago")
    .reduce((s, l) => s + Number(l.valor), 0);
  const balanco = receitasDoMes - despesasDoMes;

  const totalAPagar = pendentesDespesa.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = pendentesReceita.reduce((s, l) => s + Number(l.valor), 0);
  const atrasadas = [...pendentesDespesa, ...pendentesReceita].filter(
    (l) => statusEfetivoLancamento(l.status, l.dataVencimento) === "atrasado"
  ).length;

  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="header-gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Controle financeiro</p>
            <h1 className="text-2xl font-bold capitalize">{nomeMes}</h1>
          </div>
          <Link href="/financeiro/novo" className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm text-xl">
            +
          </Link>
        </div>

        {/* Balanço do mês */}
        <div className="mt-5 rounded-card p-5" style={{ background: "linear-gradient(160deg,#eafaf0,#f6faf7)" }}>
          <p className="text-xs font-semibold tracking-wide text-muted">BALANÇO DO MÊS</p>
          <p className={`text-4xl font-extrabold mt-1 ${balanco >= 0 ? "text-primary" : "text-danger"}`}>
            {formatarMoeda(balanco)}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl border p-3" style={{ borderColor: "#cdeedb" }}>
              <p className="text-primary text-xs font-semibold">RECEITAS</p>
              <p className="font-bold mt-1">{formatarMoeda(receitasDoMes)}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: "#f4c7c2" }}>
              <p className="text-danger text-xs font-semibold">DESPESAS</p>
              <p className="font-bold mt-1">{formatarMoeda(despesasDoMes)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Botão de novo lançamento em destaque */}
        <Link href="/financeiro/novo" className="btn-primary">
          + Novo lançamento
        </Link>

        {/* Pendências e alertas */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">PENDÊNCIAS E ALERTAS</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/financeiro/pagar" className="card block">
              <p className="text-xs font-semibold text-danger">A PAGAR</p>
              <p className="font-bold mt-1">{formatarMoeda(totalAPagar)}</p>
              <p className="text-xs text-muted mt-1">{pendentesDespesa.length} conta(s)</p>
            </Link>
            <Link href="/financeiro/receber" className="card block">
              <p className="text-xs font-semibold text-primary">A RECEBER</p>
              <p className="font-bold mt-1">{formatarMoeda(totalAReceber)}</p>
              <p className="text-xs text-muted mt-1">{pendentesReceita.length} conta(s)</p>
            </Link>
          </div>
          {atrasadas > 0 && (
            <div className="card mt-3" style={{ background: "#FBE4E2" }}>
              <p className="text-sm font-semibold text-danger">⚠️ {atrasadas} lançamento(s) em atraso</p>
            </div>
          )}
        </div>

        {/* Acesso rápido */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">ACESSO RÁPIDO</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <AtalhoRapido href="/financeiro/pagar" icone="🧾" label="A pagar" />
            <AtalhoRapido href="/financeiro/receber" icone="💰" label="A receber" />
            <AtalhoRapido href="/financeiro/novo" icone="➕" label="Novo" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AtalhoRapido({ href, icone, label }: { href: string; icone: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl bg-white shadow-card flex items-center justify-center text-xl">
        {icone}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
