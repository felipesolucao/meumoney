// ============================================================================
// API: /api/auth/login
// POST -> autentica com e-mail + senha (PIN de 6 dígitos)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { criarSessao } from "../../../../lib/auth";
import { conferirSenha, loginBloqueado, registrarTentativaFalha, limparTentativas } from "../../../../lib/senha";

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; senha?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requisição inválida. Recarregue a página e tente novamente." }, { status: 400 });
    }

    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }

    const emailNormalizado = email.toLowerCase().trim();

    if (loginBloqueado(emailNormalizado)) {
      return NextResponse.json(
        { error: "Muitas tentativas erradas. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
    const senhaCorreta = usuario ? await conferirSenha(senha, usuario.senha) : false;

    if (!usuario || !senhaCorreta) {
      registrarTentativaFalha(emailNormalizado);
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    limparTentativas(emailNormalizado);
    await criarSessao({ id: usuario.id, email: usuario.email, nome: usuario.nome, papel: usuario.papel });

    return NextResponse.json({ id: usuario.id, email: usuario.email, nome: usuario.nome, papel: usuario.papel });
  } catch (erro) {
    // Erro inesperado (ex.: banco de dados fora do ar). Loga no servidor e
    // devolve uma mensagem em JSON — nunca deixa a rota "estourar" sem corpo,
    // o que faria o front-end quebrar ao tentar ler res.json().
    console.error("Erro inesperado em /api/auth/login:", erro);
    return NextResponse.json(
      { error: "Erro no servidor. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
