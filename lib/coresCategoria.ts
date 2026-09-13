// ============================================================================
// Paleta categórica para gráficos por categoria (Relatórios, Despesas por
// categoria da Início).
// ----------------------------------------------------------------------------
// Categoria.cor tem o mesmo valor padrão para TODAS as categorias no banco
// (não existe nenhuma tela onde o usuário escolhe uma cor própria pra uma
// categoria — só emoji e nome) — por isso todo gráfico de categoria sempre
// saía inteiro verde, com só "Sem categoria" destacando em cinza.
//
// Em vez disso, cada categoria recebe uma cor fixa e determinística a partir
// do seu id (hash simples -> índice na paleta abaixo), então a mesma
// categoria sempre aparece com a mesma cor em qualquer gráfico/legenda, sem
// depender da ordem em que aparece na lista (a cor segue a categoria, nunca
// a posição/ranking dela).
//
// As 8 cores vêm da paleta categórica validada (contraste + segurança para
// daltonismo) documentada na skill de dataviz deste ambiente — nessa ordem
// fixa, que é a que passa nos testes de distinção entre pares adjacentes.
// ============================================================================
const PALETA_CATEGORICA = [
  "#2a78d6", // azul
  "#eb6834", // laranja
  "#1baf7a", // água
  "#eda100", // amarelo
  "#e87ba4", // magenta
  "#008300", // verde
  "#4a3aa7", // violeta
  "#e34948", // vermelho
];

export const COR_SEM_CATEGORIA = "#6b7280";

export function corCategoria(categoriaId: string | null | undefined): string {
  if (!categoriaId) return COR_SEM_CATEGORIA;
  let hash = 0;
  for (let i = 0; i < categoriaId.length; i++) {
    hash = (hash * 31 + categoriaId.charCodeAt(i)) >>> 0;
  }
  return PALETA_CATEGORICA[hash % PALETA_CATEGORICA.length];
}
