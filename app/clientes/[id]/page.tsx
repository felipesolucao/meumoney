// ============================================================================
// PÁGINA: Detalhe do cliente
// ----------------------------------------------------------------------------
// Mostra dados do cliente, score, e todos os contratos vinculados a ele,
// com o progresso de pagamento de cada um.
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { formatarMoeda, iniciais, statusDoContrato } from "../../../lib/calculos";
import Badge, { tomEScore, tomEStatusContrato } from "../../../components/Badge";

export const dynamic = "force-dynamic";

export default async function DetalheCliente({ params }: { params: { id: string } }) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: { contratos: { include: { parcelas: true }, orderBy: { criadoEm: "desc" } } },
  });

  if (!cliente) notFound();

  const { tom, texto } = tomEScore(cliente.score);
  const totalEmprestado = cliente.contratos.reduce((s, c) => s + Number(c.valorEmprestado), 0);
  const totalAReceber = cliente.contratos
    .flatMap((c) => c.parcelas)
    .filter((p) => p.status !== "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <Link href="/clientes" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
          ←
        </Link>
        <h1 className="text-xl font-bold truncate">{cliente.nome}</h1>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="avatar !w-14 !h-14 !text-xl">{iniciais(cliente.nome)}</div>
            <div className="flex-1">
              <p className="font-bold text-lg">{cliente.nome}</p>
              {cliente.telefone && <p className="text-sm text-muted">{cliente.telefone}</p>}
            </div>
            <Badge tom={tom}>{texto}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted font-semibold">TOTAL EMPRESTADO</p>
              <p className="font-bold mt-1">{formatarMoeda(totalEmprestado)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted font-semibold">A RECEBER</p>
              <p className="font-bold mt-1">{formatarMoeda(totalAReceber)}</p>
            </div>
          </div>
        </div>

        <Link href={`/contratos/novo?clienteId=${cliente.id}`} className="btn-primary">
          + Novo contrato para este cliente
        </Link>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">
            CONTRATOS ({cliente.contratos.length})
          </p>
          <div className="space-y-3">
            {cliente.contratos.length === 0 && (
              <div className="card text-center text-muted text-sm">Nenhum contrato ainda.</div>
            )}
            {cliente.contratos.map((c) => {
              const pagas = c.parcelas.filter((p) => p.status === "pago").length;
              const progresso = c.parcelas.length ? (pagas / c.parcelas.length) * 100 : 0;
              const statusInfo = tomEStatusContrato(statusDoContrato(c.parcelas));
              return (
                <Link key={c.id} href={`/contratos/${c.id}`} className="card block">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{c.codigo}</p>
                    <Badge tom={statusInfo.tom}>{statusInfo.texto}</Badge>
                  </div>
                  <p className="text-2xl font-extrabold text-primary mt-1">{formatarMoeda(c.valorTotal)}</p>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {pagas} de {c.parcelas.length} pagas · {c.numeroParcelas}x
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
