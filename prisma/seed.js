// ============================================================================
// SEED — dados de exemplo (opcional)
// ----------------------------------------------------------------------------
// Roda com: npm run db:seed
// Cria alguns clientes e contratos de exemplo para testar o app rapidamente.
// ============================================================================
const { PrismaClient } = require("@prisma/client");
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
  const nomes = [
    { nome: "Gold", telefone: "(62) 98383-8383" },
    { nome: "Delux", telefone: "(62) 99903-8373" },
    { nome: "Teste", telefone: "(62) 99448-6244" },
    { nome: "Pai", telefone: "(62) 99394-7500" },
    { nome: "Izabel", telefone: "(62) 90999-2929" },
  ];

  for (const dados of nomes) {
    const cliente = await prisma.cliente.create({ data: { ...dados, score: "medio" } });

    const { valorTotal, parcelas } = calcularParcelas(80, 2.5, 4, new Date());
    const codigo = `#${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

    await prisma.contrato.create({
      data: {
        codigo,
        clienteId: cliente.id,
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

  // --- Categorias e contas padrão do módulo financeiro ----------------------
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
    await prisma.categoria.create({ data: c });
  }

  const contas = [
    { nome: "Nubank", icone: "💜" },
    { nome: "Infinitypay", icone: "🏦" },
    { nome: "Dinheiro", icone: "💵" },
  ];
  for (const c of contas) {
    await prisma.conta.create({ data: c });
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
