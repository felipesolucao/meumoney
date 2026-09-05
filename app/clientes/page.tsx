// ============================================================================
// PÁGINA: Clientes (lista)
// ============================================================================
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { iniciais } from "../../lib/calculos";
import Badge, { tomEScore } from "../../components/Badge";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { contratos: true } } },
  });

  return (
    <div>
      <div className="header-gradient flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted text-sm">{clientes.length} cadastrado(s)</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm">🔔</div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <Link href="/clientes/novo" className="btn-primary">
          + Novo cliente
        </Link>

        {clientes.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhum cliente cadastrado ainda.</div>
        )}

        {clientes.map((c) => {
          const { tom, texto } = tomEScore(c.score);
          return (
            <Link key={c.id} href={`/clientes/${c.id}`} className="card flex items-center gap-3 block">
              <div className="avatar">{iniciais(c.nome)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold truncate">{c.nome}</p>
                  <Badge tom={tom}>{texto}</Badge>
                </div>
                {c.telefone && <p className="text-sm text-muted">· {c.telefone}</p>}
                <p className="text-sm text-primary font-semibold">{c._count.contratos} contrato(s)</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
