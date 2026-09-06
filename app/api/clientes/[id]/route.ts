// ============================================================================
// API: /api/clientes/[id]
// GET    -> detalhe do cliente com todos os contratos e parcelas
// PATCH  -> atualiza dados cadastrais do cliente
// DELETE -> remove o cliente (e seus contratos/parcelas, via cascade)
// ----------------------------------------------------------------------------
// Todas as ações aqui exigem que o cliente pertença ao usuário logado —
// senão respondem 404, como se o cliente não existisse (não revelamos que
// o registro existe na conta de outra pessoa).
// Toda edição/exclusão grava um snapshot em HistoricoAcao (ver lib/historico.ts).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { obterSessao } from "../../../../lib/auth";
import { registrarAcao } from "../../../../lib/historico";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: {
      contratos: {
        orderBy: { criadoEm: "desc" },
        include: { parcelas: { orderBy: { numero: "asc" } } },
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

// Campos cadastrais aceitos na edição — mantidos numa lista para não repetir
// o mesmo bloco de "se veio no body, atualiza" 15 vezes.
const CAMPOS_TEXTO = [
  "nome", "telefone", "telefone2", "email", "cpf", "rg",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf",
  "referencia", "observacoes",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cliente.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const body = await req.json();
  const dados: Record<string, unknown> = {};

  for (const campo of CAMPOS_TEXTO) {
    if (body[campo] !== undefined) dados[campo] = body[campo]?.trim() || null;
  }
  if (body.score !== undefined) dados.score = body.score;
  if (body.situacao !== undefined) dados.situacao = body.situacao;
  if (body.dataNascimento !== undefined) {
    dados.dataNascimento = body.dataNascimento ? new Date(body.dataNascimento) : null;
  }

  const cliente = await prisma.cliente.update({ where: { id: params.id }, data: dados });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CLIENTE_EDITADO",
    entidade: "Cliente",
    entidadeId: cliente.id,
    descricao: `Cliente editado: ${cliente.nome}`,
    dadosAntes: existente,
    dadosDepois: cliente,
  });

  return NextResponse.json(cliente);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const existente = await prisma.cliente.findFirst({ where: { id: params.id, usuarioId: sessao.id } });
  if (!existente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  await prisma.cliente.delete({ where: { id: params.id } });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CLIENTE_EXCLUIDO",
    entidade: "Cliente",
    entidadeId: existente.id,
    descricao: `Cliente excluído: ${existente.nome}`,
    dadosAntes: existente,
    // Nota: excluir um cliente também apaga (em cascata) todos os contratos e
    // parcelas dele. Reverter recria o cadastro do cliente, mas NÃO os
    // contratos apagados em cascata — o aviso de reversão deixa isso claro.
  });

  return NextResponse.json({ ok: true });
}
