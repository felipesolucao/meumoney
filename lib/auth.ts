// ============================================================================
// AUTENTICAÇÃO — sessão via cookie assinado (JWT)
// ----------------------------------------------------------------------------
// Não usamos NextAuth nem nenhuma lib de login pronta: é só um cookie HTTP
// (invisível pro JavaScript do navegador, "httpOnly") guardando um token
// assinado com a variável de ambiente JWT_SECRET. Isso evita que alguém
// forje um cookie de admin sem conhecer essa chave.
//
// IMPORTANTE: defina JWT_SECRET no Railway (Variables) e no seu .env local
// com um valor longo e aleatório antes de ir pra produção — sem isso, o
// app usa uma chave padrão de desenvolvimento, insegura para uso real.
// ============================================================================
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const CHAVE = new TextEncoder().encode(process.env.JWT_SECRET || "chave-de-desenvolvimento-troque-isso");
const NOME_COOKIE = "sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

export type SessaoUsuario = {
  id: string;
  email: string;
  nome: string;
  papel: "admin" | "usuario";
};

// ----------------------------------------------------------------------------
// Cria o cookie de sessão depois de um login ou cadastro bem-sucedido.
// ----------------------------------------------------------------------------
export async function criarSessao(usuario: SessaoUsuario) {
  const token = await new SignJWT({ ...usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SEGUNDOS}s`)
    .sign(CHAVE);

  cookies().set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

// ----------------------------------------------------------------------------
// Lê e valida a sessão atual a partir do cookie. Retorna null se não houver
// cookie, se ele estiver expirado, ou se a assinatura não bater.
// ----------------------------------------------------------------------------
export async function obterSessao(): Promise<SessaoUsuario | null> {
  const token = cookies().get(NOME_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, CHAVE);
    return {
      id: payload.id as string,
      email: payload.email as string,
      nome: (payload.nome as string) || "Usuário",
      papel: payload.papel as "admin" | "usuario",
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Usada em Server Components de página: garante que existe uma sessão válida,
// redirecionando pro login se não houver (segunda camada de proteção além do
// middleware.ts, que já bloqueia o acesso às rotas antes de chegar aqui).
// ----------------------------------------------------------------------------
export async function exigirSessao(): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  return sessao;
}

// ----------------------------------------------------------------------------
// Mesma ideia, mas só permite administradores — usada em app/admin.
// ----------------------------------------------------------------------------
export async function exigirAdmin(): Promise<SessaoUsuario> {
  const sessao = await exigirSessao();
  if (sessao.papel !== "admin") redirect("/");
  return sessao;
}

// ----------------------------------------------------------------------------
// Apaga o cookie de sessão (logout).
// ----------------------------------------------------------------------------
export async function encerrarSessao() {
  cookies().set(NOME_COOKIE, "", { path: "/", maxAge: 0 });
}
