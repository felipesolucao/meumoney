// ============================================================================
// API: /api/auth/registro
// POST -> cria uma nova conta de usuário (sempre com papel "usuario" — não
//         é possível se autocadastrar como admin por aqui, de propósito).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { criarSessao } from "../../../../lib/auth";
import { senhaValida, emailValido, gerarHashSenha } from "../../../../lib/senha";

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; senha?: string; telefone?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Requisição inválida. Recarregue a página e tente novamente." }, { status: 400 });
    }

    const { email, senha, telefone } = body;

    // --- Validação dos 3 campos exigidos no cadastro -------------------------
    if (!email || !emailValido(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    if (!senha || !senhaValida(senha)) {
      return NextResponse.json({ error: "A senha deve ter exatamente 6 números." }, { status: 400 });
    }
    const telefoneLimpo = (telefone || "").replace(/\D/g, "");
    if (telefoneLimpo.length < 10) {
      return NextResponse.json({ error: "Informe um telefone (WhatsApp) válido, com DDD." }, { status: 400 });
    }

    const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existente) {
      return NextResponse.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });
    }

    const usuario = await prisma.usuario.create({
      data: {
        email: email.toLowerCase().trim(),
        senha: await gerarHashSenha(senha),
        telefone: telefoneLimpo,
        papel: "usuario",
      },
    });

    await criarSessao({ id: usuario.id, email: usuario.email, papel: usuario.papel });

    return NextResponse.json({ id: usuario.id, email: usuario.email }, { status: 201 });
  } catch (erro) {
    // Erro inesperado (ex.: banco de dados fora do ar, violação de unicidade
    // não prevista). Loga no servidor e devolve JSON, nunca um corpo vazio.
    console.error("Erro inesperado em /api/auth/registro:", erro);
    return NextResponse.json(
      { error: "Erro no servidor. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
