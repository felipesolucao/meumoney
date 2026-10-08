// Conteúdo provisório. Substitua os símbolos por imagens e mantenha IDs únicos.
export const imagens = [
  { id: "morango", nome: "Morango", simbolo: "🍓" },
  { id: "uva", nome: "Uva", simbolo: "🍇" },
  { id: "limao", nome: "Limão", simbolo: "🍋" },
  { id: "melancia", nome: "Melancia", simbolo: "🍉" },
  { id: "cereja", nome: "Cereja", simbolo: "🍒" },
  { id: "abacaxi", nome: "Abacaxi", simbolo: "🍍" },
  { id: "kiwi", nome: "Kiwi", simbolo: "🥝" },
  { id: "laranja", nome: "Laranja", simbolo: "🍊" },
  { id: "banana", nome: "Banana", simbolo: "🍌" },
  { id: "maca", nome: "Maçã", simbolo: "🍎" },
  { id: "pera", nome: "Pera", simbolo: "🍐" },
  { id: "pessego", nome: "Pêssego", simbolo: "🍑" },
  { id: "coco", nome: "Coco", simbolo: "🥥" },
  { id: "abacate", nome: "Abacate", simbolo: "🥑" },
  { id: "cenoura", nome: "Cenoura", simbolo: "🥕" },
  { id: "milho", nome: "Milho", simbolo: "🌽" },
];

export function criarCartas(pares: 8 | 16) {
  const cartas = imagens.slice(0, pares).flatMap((imagem) =>
    [0, 1].map((copia) => ({ ...imagem, chave: `${imagem.id}-${copia}` })),
  );
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}
