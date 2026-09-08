// ============================================================================
// API: /api/clientes
// GET  -> lista os clientes DO USUÁRIO LOGADO, com contagem de contratos
// POST -> cria um novo cliente, já vinculado ao usuário logado
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { obterSessao } from "../../../lib/auth";
import { registrarAcao } from "../../../lib/historico";

export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const clientes = await prisma.cliente.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { criadoEm: "desc" },
    include: {
      _count: { select: { contratos: true } },
      // Só o valorTotal de cada contrato — usado pra somar e ordenar por
      // "maior valor"/"menor valor" na tela de clientes (ver app/clientes/page.tsx).
      contratos: { select: { valorTotal: true } },
    },
  });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const {
    nome, telefone, telefone2, email, cpf, rg, dataNascimento, score, situacao,
    cep, logradouro, numero, complemento, bairro, cidade, uf,
    referencia, observacoes,
  } = body;

  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: nome.trim(),
      telefone: telefone?.trim() || null,
      telefone2: telefone2?.trim() || null,
      email: email?.trim() || null,
      cpf: cpf?.trim() || null,
      rg: rg?.trim() || null,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      score: score || "medio",
      situacao: situacao || "ativo",
      cep: cep?.trim() || null,
      logradouro: logradouro?.trim() || null,
      numero: numero?.trim() || null,
      complemento: complemento?.trim() || null,
      bairro: bairro?.trim() || null,
      cidade: cidade?.trim() || null,
      uf: uf?.trim() || null,
      referencia: referencia?.trim() || null,
      observacoes: observacoes?.trim() || null,
      usuarioId: sessao.id,
    },
  });

  await registrarAcao(prisma, {
    usuarioId: sessao.id,
    tipo: "CLIENTE_CADASTRADO",
    entidade: "Cliente",
    entidadeId: cliente.id,
    descricao: `Cliente cadastrado: ${cliente.nome}`,
    dadosDepois: cliente,
  });

  return NextResponse.json(cliente, { status: 201 });
}
