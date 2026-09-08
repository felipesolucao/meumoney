// ============================================================================
// MIDDLEWARE — protege todas as telas do app atrás de login
// ----------------------------------------------------------------------------
// Roda antes de qualquer página ser renderizada. Se não houver um cookie de
// sessão válido, manda pra /login. As rotas de API não passam por aqui —
// cada uma valida a sessão sozinha (ver lib/auth.ts) e responde com erro
// 401 em JSON em vez de redirecionar, que não faria sentido pra um fetch().
//
// Roda no runtime "Edge" do Next.js, por isso usamos a lib "jose" (e não
// bcrypt, que depende de módulos nativos do Node) para verificar o token.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const CHAVE = new TextEncoder().encode(process.env.JWT_SECRET || "chave-de-desenvolvimento-troque-isso");

// Rotas que não exigem login.
// "/~offline" é a página de fallback do PWA (ver app/~offline/page.tsx) — na
// prática o service worker sempre serve ela direto do cache sem passar por
// aqui, mas fica pública por segurança caso alguém acesse a URL diretamente.
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/~offline"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sessao")?.value;

  if (ROTAS_PUBLICAS.some((rota) => pathname === rota)) {
    // Se já está logado e tenta abrir /login ou /cadastro, manda pro início.
    if (token) {
      try {
        await jwtVerify(token, CHAVE);
        return NextResponse.redirect(new URL("/", req.url));
      } catch {
        // token inválido/expirado — deixa seguir pro login normalmente
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, CHAVE);

    // Só quem tem papel "admin" pode acessar qualquer rota /admin.
    if (pathname.startsWith("/admin") && payload.papel !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Aplica o middleware a todas as rotas, exceto arquivos estáticos e a API
// (a API se protege sozinha — ver comentário acima).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo\\.png$).*)"],
};
