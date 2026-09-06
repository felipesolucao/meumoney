// ============================================================================
// API: /api/perfil
// PATCH -> atualiza o nome do usuário logado. Depois de salvar no banco,
//          reemite o cookie de sessão já com o nome novo — assim o "Olá,
//          {nome}" do topo do app reflete a mudança sem precisar deslogar.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao, criarSessao } from "../../../lib/auth";

export async function PATCH(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { nome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const nome = (body.nome || "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Informe um nome." }, { status: 400 });
  }

  const usuario = await prisma.usuario.update({
    where: { id: sessao.id },
    data: { nome },
  });

  // Reemite o cookie com o nome atualizado (o cookie é a única fonte do nome
  // usada pelas páginas — sem isto, o topo do app continuaria mostrando o
  // nome antigo até o usuário deslogar e entrar de novo).
  await criarSessao({ id: usuario.id, email: usuario.email, nome: usuario.nome, papel: usuario.papel });

  return NextResponse.json({ nome: usuario.nome });
}
