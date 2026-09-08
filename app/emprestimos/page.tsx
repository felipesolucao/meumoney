// ============================================================================
// PÁGINA: Empréstimos (antigo "Início")
// ----------------------------------------------------------------------------
// Mostra o resumo da carteira de empréstimos (total emprestado, recebido, a
// receber), as parcelas que vencem hoje, atalhos rápidos e a lista de
// contratos ativos.
//
// Esta tela era a antiga "Início" — o conteúdo é o mesmo de antes, só mudou
// de rota (de "/" para "/emprestimos") e de título, porque agora "Início" é
// uma visão geral separada que junta este módulo com o Financeiro pessoal
// (ver app/page.tsx).
// ============================================================================
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { formatarMoeda, iniciais, statusDoContrato, statusDaParcela } from "../../lib/calculos";
import { exigirSessao } from "../../lib/auth";
import ResumoContratos from "../../components/ResumoContratos";
import { IconBell, IconWallet, IconDocument, IconReceipt, IconChart } from "../../components/Icons";

export const dynamic = "force-dynamic";

export default async function Emprestimos() {
  const sessao = await exigirSessao();

  const contratos = await prisma.contrato.findMany({
    where: { usuarioId: sessao.id },
    include: { cliente: true, parcelas: true },
    orderBy: { criadoEm: "desc" },
  });

  const todasParcelas = contratos.flatMap((c) => c.parcelas);

  const totalContratos = contratos.reduce((soma, c) => soma + Number(c.valorTotal), 0);
  const lucro = contratos.reduce((soma, c) => soma + Number(c.valorLucro), 0);
  const atrasado = todasParcelas.filter((p) => statusDaParcela(p.vencimento, p.status === "pago") === "atrasado").reduce((soma, p) => soma + Number(p.valor), 0);
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
  const status = [...statusPorContrato.values()];

  return (
    <div>
      <div className="header-gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Painel de</p>
            <h1 className="text-2xl font-bold">Contratos</h1>
          </div>
          <div className="icon-btn text-foreground">
            <IconBell size={19} />
          </div>
        </div>

      </div>

      <div className="loans-dashboard px-5 mt-5 space-y-5">
        <ResumoContratos total={totalContratos} recebido={recebido} pendente={aReceber} lucro={lucro} atrasado={atrasado} emDia={status.filter((s) => s === "em_dia").length} atrasados={status.filter((s) => s === "atrasado").length} quitados={status.filter((s) => s === "quitado").length} />
        {/* Parcelas de hoje */}
        <div className="loans-today card flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-primary">
            <IconReceipt size={22} />
          </div>
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
        <div className="loans-shortcuts">
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">ACESSO RÁPIDO</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            <AtalhoRapido href="/financeiro" icon={<IconWallet size={22} />} label="Financeiro" />
            <AtalhoRapido href="/contratos" icon={<IconDocument size={22} />} label="Contratos" />
            <AtalhoRapido href="/parcelas" icon={<IconReceipt size={22} />} label="Parcelas" />
            <AtalhoRapido href="/historico?entidade=Contrato&voltar=/emprestimos" icon={<IconChart size={22} />} label="Histórico" />
          </div>
        </div>

        {/* Contratos ativos */}
        <div className="loans-active">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-wide text-muted">CONTRATOS ATIVOS</p>
            <Link href="/contratos" className="text-primary text-sm font-semibold">
              Ver todos
            </Link>
          </div>

          <div className="loans-active-grid space-y-3">
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
                    <div className="h-1.5 rounded-pill bg-muted-bg mt-2 overflow-hidden">
                      <div className="h-full bg-primary rounded-pill" style={{ width: `${progresso}%` }} />
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

function AtalhoRapido({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2">
      <div className="quick-tile text-primary">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
