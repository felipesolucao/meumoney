export { preencherModelo } from "./modelosCobranca";

export const CATEGORIAS_MODELO_CONTRATO = [
  { valor: "emprestimo", label: "Empréstimo", icone: "📄" },
  { valor: "venda", label: "Venda", icone: "🛍️" },
] as const;

export type CategoriaModeloContrato = (typeof CATEGORIAS_MODELO_CONTRATO)[number]["valor"];

export const MODELOS_CONTRATO_PADRAO = [
  {
    titulo: "Resumo do contrato",
    categoria: "emprestimo" as CategoriaModeloContrato,
    mensagem: `Olá, {nome}! 👋

Segue o resumo do nosso *contrato de empréstimo*:

💰 *Valor emprestado:* {valorContrato}
📈 *Juros:* {taxaJurosLabel}
📆 *Frequência:* {frequencia}
🔢 *Parcelas:* {numeroParcelas}x de {valorParcela}
🗓️ *Início:* {dataInicio}
💵 *Total a pagar:* {totalReceber}

*Cronograma de vencimentos:*
{cronograma}

Qualquer dúvida estou à disposição. Obrigado pela confiança! 🙏`,
  },
  {
    titulo: "Resumo da venda",
    categoria: "venda" as CategoriaModeloContrato,
    mensagem: `Opa, {nome}👋

Segue o resumo do nosso *contrato de Venda*:

"{nomeProduto}"

💵 Valor da venda: {valorVenda}
✅ Entrada: {entrada}
📆 Frequência: {frequencia}
🔢 Parcelas: {numeroParcelas}x de {valorParcela}
🗓️ Início: {dataInicio}

*Cronograma de vencimentos:*
{cronograma}`,
  },
];

export const VARIAVEIS_MODELO_CONTRATO: Record<CategoriaModeloContrato, string[]> = {
  emprestimo: ["{nome}", "{valorContrato}", "{taxaJurosLabel}", "{frequencia}", "{numeroParcelas}", "{valorParcela}", "{dataInicio}", "{totalReceber}", "{cronograma}"],
  venda: ["{nome}", "{nomeProduto}", "{valorVenda}", "{entrada}", "{frequencia}", "{numeroParcelas}", "{valorParcela}", "{dataInicio}", "{cronograma}"],
};

export const EXEMPLO_MODELO_CONTRATO: Record<CategoriaModeloContrato, Record<string, string | number>> = {
  emprestimo: {
    nome: "Gold",
    valorContrato: "R$ 5.000,00",
    taxaJurosLabel: "5% a.m.",
    frequencia: "Mensal",
    numeroParcelas: 5,
    valorParcela: "R$ 1.030,00",
    dataInicio: "19/09/2026",
    totalReceber: "R$ 5.150,00",
    cronograma: "1. R$ 1.030,00 - 19/09/2026\n2. R$ 1.030,00 - 19/10/2026\n3. R$ 1.030,00 - 19/11/2026\n4. R$ 1.030,00 - 19/12/2026\n5. R$ 1.030,00 - 19/01/2027",
  },
  venda: {
    nome: "Gold",
    nomeProduto: "Notebook Gamer",
    valorVenda: "R$ 3.000,00",
    entrada: "R$ 500,00",
    frequencia: "Mensal",
    numeroParcelas: 5,
    valorParcela: "R$ 500,00",
    dataInicio: "19/09/2026",
    cronograma: "1. R$ 500,00 - 19/09/2026\n2. R$ 500,00 - 19/10/2026\n3. R$ 500,00 - 19/11/2026\n4. R$ 500,00 - 19/12/2026\n5. R$ 500,00 - 19/01/2027",
  },
};
