// ============================================================================
// PÁGINA: Início (Dashboard)
// ----------------------------------------------------------------------------
// Mostra o resumo financeiro (total emprestado, recebido, a receber), as
// parcelas que vencem hoje, atalhos rápidos e a lista de contratos ativos.
// ============================================================================
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, iniciais, statusDoContrato } from "@/lib/calculos";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const contratos = await prisma.contrato.findMany({
    include: { cliente: true, parcelas: true },
    orderBy: { criadoEm: "desc" },
  });

  const todasParcelas = contratos.flatMap((c) => c.parcelas);

  const totalEmprestado = contratos.reduce((soma, c) => soma + Number(c.valorEmprestado), 0);
  const recebido = todasParcelas
    .filter((p) => p.status === "pago")
    .reduce((soma, p) => soma + Number(p.valorPago ?? p.valor), 0);
  const aReceber = todasParcelas
    .filter((p) => p.status !== "pago")
    .reduce((soma, p) => soma + Number(p.valor), 0);

  const hojeStr = new Date().toDateString();
  const parcelasHoje = todasParcelas.filter(
    (p) => p.status !== "pago" && new Date(p.vencimento).toDateString() === hojeStr
  );

  const statusPorContrato = new Map(contratos.map((c) => [c.id, statusDoContrato(c.parcelas)]));
  const contratosAtivos = contratos.filter((c) => statusPorContrato.get(c.id) !== "quitado").slice(0, 5);
  const tudoEmDia = ![...statusPorContrato.values()].some((s) => s === "atrasado");

  return (
    <div>
      <div className="header-gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Olá,</p>
            <h1 className="text-2xl font-bold">Seu painel</h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm">🔔</div>
        </div>

        {/* Cartão de resumo financeiro */}
        <div className="mt-5 rounded-card p-5" style={{ background: "linear-gradient(160deg,#eafaf0,#f6faf7)" }}>
          <p className="text-xs font-semibold tracking-wide text-muted">TOTAL EMPRESTADO</p>
          <p className="text-4xl font-extrabold mt-1">{formatarMoeda(totalEmprestado)}</p>
          <span
            className="badge mt-3"
            style={{ background: tudoEmDia ? "#E3F5E9" : "#FBE4E2", color: tudoEmDia ? "#2FA85A" : "#E4544A" }}
          >
            {tudoEmDia ? "Tudo em dia" : "Existem parcelas atrasadas"}
          </span>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl border border-primary-light p-3" style={{ borderColor: "#cdeedb" }}>
              <p className="text-primary text-xs font-semibold">RECEBIDO</p>
              <p className="font-bold mt-1">{formatarMoeda(recebido)}</p>
            </div>
            <div className="rounded-2xl border p-3" style={{ borderColor: "#f7e3ba" }}>
              <p className="text-amber-text text-xs font-semibold">A RECEBER</p>
              <p className="font-bold mt-1">{formatarMoeda(aReceber)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Parcelas de hoje */}
        <div className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-xl">📅</div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">PARCELAS DE HOJE</p>
            {parcelasHoje.length === 0 ? (
              <>
                <p className="font-bold">Não temos parcelas hoje</p>
                <p className="text-sm text-muted">Nenhum vencimento para hoje</p>
              </>
            ) : (
              <p className="font-bold">
                {parcelasHoje.length} parcela(s) — {formatarMoeda(parcelasHoje.reduce((s, p) => s + Number(p.valor), 0))}
              </p>
            )}
          </div>
        </div>

        {/* Acesso rápido */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">ACESSO RÁPIDO</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            <AtalhoRapido href="/contratos" icone="📄" label="Contratos" />
            <AtalhoRapido href="/parcelas" icone="🧾" label="Parcelas" />
            <AtalhoRapido href="/relatorios" icone="📈" label="Histórico" />
            <AtalhoRapido href="/menu" icone="❓" label="Suporte" />
          </div>
        </div>

        {/* Contratos ativos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-wide text-muted">CONTRATOS ATIVOS</p>
            <Link href="/contratos" className="text-primary text-sm font-semibold">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {contratosAtivos.length === 0 && (
              <div className="card text-center text-muted text-sm">Nenhum contrato ativo ainda.</div>
            )}
            {contratosAtivos.map((c) => {
              const pagas = c.parcelas.filter((p) => p.status === "pago").length;
              const progresso = c.parcelas.length ? (pagas / c.parcelas.length) * 100 : 0;
              return (
                <Link key={c.id} href={`/contratos/${c.id}`} className="card flex items-center gap-3 block">
                  <div className="avatar">{iniciais(c.cliente.nome)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{c.cliente.nome}</p>
                    <p className="text-sm text-muted">
                      {formatarMoeda(c.valorTotal)} · {c.numeroParcelas}x
                    </p>
                    <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {pagas} de {c.parcelas.length} parcelas pagas
                    </p>
                  </div>
                </Link>
              );
            })}
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
