"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BotaoVoltar from "../../components/BotaoVoltar";
import { IconCheck, IconHome, IconRefresh } from "../../components/Icons";
import { useToast } from "../../components/ToastProvider";
import { MODELOS_COBRANCA, preencherModelo, VARIAVEIS_COBRANCA } from "../../lib/modelosCobranca";

type ModeloSalvo = { tipo: string; mensagem: string };

const EXEMPLO = {
  nome: "Gold", nomeCompleto: "Gold", numero: 1, totalParcelas: 4, valor: "R$ 89,00", total: "R$ 89,00",
  acrescimo: "R$ 0,00", vencimento: "19/09/2026", diasAtraso: 0, diasRestantes: 12, diasRestantesTexto: " (em 12 dias)",
};

export default function ModelosCobrancaPage() {
  const toast = useToast();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [modelos, setModelos] = useState<ModeloSalvo[]>([]);
  const [tipo, setTipo] = useState(MODELOS_COBRANCA[0].tipo);
  const [mensagem, setMensagem] = useState<string>(MODELOS_COBRANCA[0].mensagem);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const padraoAtual = MODELOS_COBRANCA.find((m) => m.tipo === tipo) ?? MODELOS_COBRANCA[0];

  useEffect(() => {
    fetch("/api/modelos-cobranca")
      .then((r) => r.json())
      .then((dados: ModeloSalvo[]) => {
        setModelos(dados);
        const primeiro = dados.find((m) => m.tipo === MODELOS_COBRANCA[0].tipo);
        if (primeiro) setMensagem(primeiro.mensagem);
      })
      .catch(() => toast("Não foi possível carregar os modelos.", "erro"))
      .finally(() => setCarregando(false));
  }, [toast]);

  function selecionar(novoTipo: string) {
    setTipo(novoTipo as typeof tipo);
    const padrao = MODELOS_COBRANCA.find((m) => m.tipo === novoTipo) ?? MODELOS_COBRANCA[0];
    setMensagem(modelos.find((m) => m.tipo === novoTipo)?.mensagem || padrao.mensagem);
  }

  function inserirVariavel(variavel: string) {
    const area = areaRef.current;
    const inicio = area?.selectionStart ?? mensagem.length;
    const fim = area?.selectionEnd ?? mensagem.length;
    setMensagem(`${mensagem.slice(0, inicio)}${variavel}${mensagem.slice(fim)}`);
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(inicio + variavel.length, inicio + variavel.length);
    });
  }

  async function salvar() {
    setSalvando(true);
    const res = await fetch("/api/modelos-cobranca", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, mensagem }) });
    setSalvando(false);
    if (!res.ok) return toast("Não foi possível salvar o modelo.", "erro");
    const salvo: ModeloSalvo = await res.json();
    setModelos((atual) => atual.map((m) => (m.tipo === tipo ? salvo : m)));
    toast("Modelo salvo!");
  }

  function restaurarPadrao() {
    setMensagem(padraoAtual.mensagem);
    toast("Texto padrão restaurado. Toque em Salvar para confirmar.");
  }

  return (
    <div>
      <header className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/menu" />
        <Link href="/" className="icon-btn text-foreground" aria-label="Início"><IconHome size={19} /></Link>
        <div><h1 className="text-xl font-bold">Modelos de cobrança</h1><p className="text-muted text-sm">Edite seus modelos de cobrança</p></div>
      </header>
      <main className="px-5 mt-5 space-y-4 pb-8">
        <section>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">MODELO</p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {MODELOS_COBRANCA.map((modelo) => <button key={modelo.tipo} onClick={() => selecionar(modelo.tipo)} className={`chip-toggle ${tipo === modelo.tipo ? "chip-toggle-ativo" : ""}`}>{modelo.icone} {modelo.titulo}</button>)}
          </div>
        </section>

        <section className="card">
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">MENSAGEM</p>
          {carregando ? <p className="text-sm text-muted py-8 text-center">Carregando modelo...</p> : <>
            <textarea ref={areaRef} value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="w-full min-h-[242px] rounded-md border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary resize-y" />
            <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
              <button onClick={salvar} disabled={salvando} className="btn-primary flex items-center justify-center gap-2"><IconCheck size={17} />{salvando ? "Salvando..." : "Salvar"}</button>
              <button onClick={restaurarPadrao} className="btn-outline !w-auto !min-h-0 !py-3 flex items-center gap-2"><IconRefresh size={17} />Padrão</button>
            </div>
          </>}
        </section>

        <section className="card">
          <p className="text-xs font-semibold tracking-wide text-muted">VARIÁVEIS DISPONÍVEIS</p>
          <p className="text-xs text-muted mt-2">Toque em uma variável para inseri-la na posição atual do texto.</p>
          <div className="flex flex-wrap gap-2 mt-3">{VARIAVEIS_COBRANCA.map((variavel) => <button key={variavel} onClick={() => inserirVariavel(variavel)} className="rounded-pill bg-muted-surface px-3 py-1.5 text-xs font-mono font-semibold">+ {variavel}</button>)}</div>
        </section>

        <section className="card">
          <p className="text-xs font-semibold tracking-wide text-muted">PRÉ-VISUALIZAÇÃO</p>
          <p className="text-xs text-muted mt-2">Usando dados de exemplo.</p>
          <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-6">{preencherModelo(mensagem, EXEMPLO)}</div>
        </section>
      </main>
    </div>
  );
}
