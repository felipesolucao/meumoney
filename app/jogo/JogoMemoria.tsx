"use client";

import { useEffect, useRef, useState } from "react";
import { criarCartas } from "./cartas";
import styles from "./jogo.module.css";

type Partida = {
  pares: 8 | 16;
  cartas: ReturnType<typeof criarCartas>;
  abertas: string[];
  encontrados: string[];
  tentativas: number;
};

export default function JogoMemoria() {
  const [partida, setPartida] = useState<Partida | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const concluido = !!partida && partida.encontrados.length === partida.pares;

  useEffect(() => {
    if (!partida || partida.abertas.length !== 2) return;
    const timeout = setTimeout(() => {
      setPartida((atual) => atual ? { ...atual, abertas: [] } : atual);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [partida]);

  useEffect(() => { titulo.current?.focus(); }, [partida?.pares, concluido]);

  function iniciar(pares: 8 | 16) {
    setPartida({ pares, cartas: criarCartas(pares), abertas: [], encontrados: [], tentativas: 0 });
  }

  function virar(chave: string) {
    setPartida((atual) => {
      if (!atual || atual.abertas.length === 2 || atual.abertas.includes(chave)) return atual;
      const carta = atual.cartas.find((item) => item.chave === chave);
      if (!carta || atual.encontrados.includes(carta.id)) return atual;
      const primeira = atual.cartas.find((item) => item.chave === atual.abertas[0]);
      if (!primeira) return { ...atual, abertas: [chave] };
      const acertou = primeira.id === carta.id;
      return {
        ...atual,
        abertas: acertou ? [] : [primeira.chave, chave],
        encontrados: acertou ? [...atual.encontrados, carta.id] : atual.encontrados,
        tentativas: atual.tentativas + 1,
      };
    });
  }

  return (
    <main className={styles.pagina}>
      <div className={styles.conteudo}>
        <p className={styles.marca}>MeuMoney · Hora de jogar</p>
        <h1 ref={titulo} tabIndex={-1}>Jogo da memória</h1>
        {!partida ? (
          <section className={styles.escolha} aria-labelledby="dificuldade">
            <div className={styles.amostra} aria-hidden="true"><span>?</span><span>🍓</span><span>?</span></div>
            <h2 id="dificuldade">Escolha a dificuldade</h2>
            <p>Vire duas cartas por vez e encontre todos os pares.</p>
            <div className={styles.niveis}>
              <button onClick={() => iniciar(8)}><strong>Fácil</strong><span>8 pares · 16 cartas</span></button>
              <button onClick={() => iniciar(16)}><strong>Difícil</strong><span>16 pares · 32 cartas</span></button>
            </div>
          </section>
        ) : (
          <>
            <div className={styles.placar} aria-live="polite" aria-atomic="true">
              <span>{partida.pares === 8 ? "Fácil" : "Difícil"}</span>
              <span><strong>{partida.encontrados.length}/{partida.pares}</strong> pares</span>
              <span><strong>{partida.tentativas}</strong> tentativas</span>
            </div>
            {concluido && <section className={styles.vitoria} role="status"><h2>Você encontrou todos os pares!</h2><p>Parabéns! Você completou o jogo em {partida.tentativas} tentativas.</p></section>}
            <div className={`${styles.tabuleiro} ${partida.pares === 16 ? styles.grande : ""}`} aria-label="Cartas do jogo">
              {partida.cartas.map((carta, indice) => {
                const encontrada = partida.encontrados.includes(carta.id);
                const aberta = encontrada || partida.abertas.includes(carta.chave);
                return <button key={carta.chave} type="button"
                  className={`${styles.carta} ${aberta ? styles.aberta : ""} ${encontrada ? styles.encontrada : ""}`}
                  aria-label={`Carta ${indice + 1}: ${aberta ? carta.nome : "virada para baixo"}${encontrada ? ", par encontrado" : ""}`}
                  aria-disabled={aberta || partida.abertas.length === 2}
                  onClick={() => virar(carta.chave)}>
                  <span aria-hidden="true">{aberta ? carta.simbolo : "?"}</span>
                  {encontrada && <small aria-hidden="true">✓</small>}
                </button>;
              })}
            </div>
            <div className={styles.acoes}>
              <button onClick={() => iniciar(partida.pares)}>{concluido ? "Jogar novamente" : "Reiniciar"}</button>
              <button onClick={() => setPartida(null)}>Trocar dificuldade</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
