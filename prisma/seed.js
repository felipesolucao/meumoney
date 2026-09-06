// ============================================================================
// SEED — dados de exemplo (opcional)
// ----------------------------------------------------------------------------
// Roda com: npm run db:seed
// Cria uma conta de administrador, uma conta de usuário de teste, e alguns
// clientes/contratos/categorias/contas de exemplo vinculados a essa conta
// de teste — pra você já ter algo pra ver ao entrar pela primeira vez.
//
// A senha das duas contas é 123456 (6 dígitos, como o app exige). TROQUE a
// senha do admin assim que possível — veja o README, seção "Conta de
// administrador".
// ============================================================================
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// Réplica simplificada da lógica de cálculo (evita depender do TS aqui)
function calcularParcelas(valorEmprestado, jurosAoMes, numeroParcelas, dataInicial) {
  const juros = jurosAoMes / 100;
  const valorTotal = valorEmprestado * (1 + juros * numeroParcelas);
  const valorParcela = Math.round((valorTotal / numeroParcelas) * 100) / 100;
  const parcelas = [];
  for (let i = 1; i <= numeroParcelas; i++) {
    const venc = new Date(dataInicial);
    venc.setMonth(venc.getMonth() + (i - 1));
    parcelas.push({ numero: i, valor: valorParcela, vencimento: venc });
  }
  return { valorTotal: Math.round(valorTotal * 100) / 100, parcelas };
}

async function main() {
  // --- Contas de acesso ------------------------------------------------------
  const senhaPadrao = await bcrypt.hash("123456", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@jurex.com" },
    update: {},
    create: { email: "admin@jurex.com", senha: senhaPadrao, telefone: "62999999999", papel: "admin" },
  });

  const usuarioTeste = await prisma.usuario.upsert({
    where: { email: "teste@jurex.com" },
    update: {},
    create: { email: "teste@jurex.com", senha: senhaPadrao, telefone: "62988888888", papel: "usuario" },
  });

  console.log(`Admin:  ${admin.email} / senha 123456`);
  console.log(`Teste:  ${usuarioTeste.email} / senha 123456`);

  // --- Clientes e contratos de exemplo, vinculados ao usuário de teste -------
  const nomes = [
    { nome: "Gold", telefone: "(62) 98383-8383" },
    { nome: "Delux", telefone: "(62) 99903-8373" },
    { nome: "Teste", telefone: "(62) 99448-6244" },
    { nome: "Pai", telefone: "(62) 99394-7500" },
    { nome: "Izabel", telefone: "(62) 90999-2929" },
  ];

  for (const dados of nomes) {
    const cliente = await prisma.cliente.create({
      data: { ...dados, score: "medio", usuarioId: usuarioTeste.id },
    });

    const { valorTotal, parcelas } = calcularParcelas(80, 2.5, 4, new Date());
    const codigo = `#${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

    await prisma.contrato.create({
      data: {
        codigo,
        clienteId: cliente.id,
        usuarioId: usuarioTeste.id,
        valorEmprestado: 80,
        tipoEmprestimo: "juros",
        jurosAoMes: 2.5,
        numeroParcelas: 4,
        frequencia: "mensal",
        dataPrimeiraParcela: parcelas[0].vencimento,
        valorTotal,
        valorLucro: Math.round((valorTotal - 80) * 100) / 100,
        parcelas: { create: parcelas.map((p) => ({ ...p, status: "a_vencer" })) },
      },
    });
  }

  // --- Categorias e contas padrão do módulo financeiro, do usuário de teste --
  const categorias = [
    { nome: "Salário", tipo: "receita", icone: "💵" },
    { nome: "Bonificação", tipo: "receita", icone: "🎁" },
    { nome: "Vendas", tipo: "receita", icone: "🛒" },
    { nome: "Aluguel", tipo: "despesa", icone: "🏠" },
    { nome: "Mercado", tipo: "despesa", icone: "🛍️" },
    { nome: "Software/Assinaturas", tipo: "despesa", icone: "💻" },
    { nome: "Transporte", tipo: "despesa", icone: "🚗" },
  ];
  // (o seed é feito para rodar uma única vez em um banco vazio — se rodar de
  // novo, essas categorias/contas simplesmente se repetem, sem problema)
  for (const c of categorias) {
    await prisma.categoria.create({ data: { ...c, usuarioId: usuarioTeste.id } });
  }

  const contas = [
    { nome: "Nubank", icone: "💜" },
    { nome: "Infinitypay", icone: "🏦" },
    { nome: "Dinheiro", icone: "💵" },
  ];
  for (const c of contas) {
    await prisma.conta.create({ data: { ...c, usuarioId: usuarioTeste.id } });
  }

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
