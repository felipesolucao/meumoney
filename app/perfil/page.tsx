// ============================================================================
// PÁGINA: Perfil da conta
// ----------------------------------------------------------------------------
// Aberta a partir do avatar (bolinha com a inicial do nome) no topo do app.
// Mostra nome, e-mail e telefone do usuário logado. Só o nome é editável
// aqui (ver PerfilFormulario) — e-mail/telefone ficam só para conferência.
// ============================================================================
import { exigirSessao } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import BotaoVoltar from "../../components/BotaoVoltar";
import PerfilFormulario from "../../components/PerfilFormulario";
import BotaoSair from "../../components/BotaoSair";
import { IconMail, IconPhone } from "../../components/Icons";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const sessao = await exigirSessao();
  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.id } });

  const inicial = (usuario?.nome || sessao.nome || "?").trim().charAt(0).toUpperCase();

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/" />
        <h1 className="text-2xl font-bold">Perfil</h1>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        <div className="card flex flex-col items-center text-center py-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
            style={{ background: "var(--gradient-avatar)" }}
          >
            {inicial}
          </div>
          <p className="font-bold text-lg mt-3">{usuario?.nome || sessao.nome}</p>
          <p className="text-sm text-muted">{sessao.papel === "admin" ? "Administrador" : "Usuário"}</p>
        </div>

        <PerfilFormulario nomeAtual={usuario?.nome || sessao.nome} />

        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-primary flex-shrink-0">
              <IconMail size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">E-mail</p>
              <p className="font-semibold truncate">{sessao.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-primary flex-shrink-0">
              <IconPhone size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Telefone</p>
              <p className="font-semibold truncate">{usuario?.telefone}</p>
            </div>
          </div>
        </div>

        <BotaoSair />
      </div>
    </div>
  );
}
