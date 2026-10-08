import type { Metadata } from "next";
import JogoMemoria from "./JogoMemoria";

export const metadata: Metadata = {
  title: "Jogo da memória | MeuMoney",
  description: "Escolha entre 8 e 16 pares e encontre as cartas iguais.",
};

export default function JogoPage() {
  return <JogoMemoria />;
}
