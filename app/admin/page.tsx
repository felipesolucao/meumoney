// ============================================================================
// PÁGINA: Painel do administrador
// ----------------------------------------------------------------------------
// Só acessível por usuários com papel "admin" (protegido pelo middleware.ts
// e reforçado aqui com exigirAdmin()). Mostra quantas contas existem na
// plataforma e a lista de quem se cadastrou — não mostra os dados
// financeiros (clientes/contratos/lançamentos) de ninguém, só a conta em si.
// ============================================================================
import { exigirAdmin } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { formatarData } from "../../lib/calculos";
import BotaoVoltar from "../../components/BotaoVoltar";
import BotaoSair from "../../components/BotaoSair";
import { IconUsers } from "../../components/Icons";

export const dynamic = "force-dynamic";

export default async function PainelAdmin() {
  await exigirAdmin();

  const usuarios = await prisma.usuario.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      _count: { select: { clientes: true, lancamentos: true } },
    },
  });

  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter((u) => u.papel === "admin").length;

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/menu" />
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted text-sm">Contas cadastradas na plataforma</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <div className="card flex items-center gap-3" style={{ background: "var(--color-primary-surface)" }}>
          <div className="w-14 h-14 rounded-md bg-card flex items-center justify-center text-primary flex-shrink-0">
            <IconUsers size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">TOTAL DE USUÁRIOS</p>
            <p className="text-3xl font-extrabold text-primary">{totalUsuarios}</p>
            <p className="text-xs text-muted">{totalAdmins} administrador(es)</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">TODOS OS USUÁRIOS</p>
          <div className="space-y-3">
            {usuarios.map((u) => (
              <div key={u.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold truncate">{u.email}</p>
                  {u.papel === "admin" && (
                    <span className="badge" style={{ background: "var(--color-success-subtle)", color: "var(--color-success)" }}>
                      <span className="badge-dot" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5">{u.telefone}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted">
                  <span>Cadastrado em {formatarData(u.criadoEm)}</span>
                  <span>
                    {u._count.clientes} cliente(s) · {u._count.lancamentos} lançamento(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}
