"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { IconCheck, IconTrash } from "./Icons";
import { CATEGORIAS_MODELO_CONTRATO, CategoriaModeloContrato, EXEMPLO_MODELO_CONTRATO, MODELOS_CONTRATO_PADRAO, VARIAVEIS_MODELO_CONTRATO, preencherModelo } from "../lib/modelosContrato";

type ModeloContrato = { id: string; titulo: string; categoria: string; mensagem: string };

export default function ModeloContratoForm({ modelo }: { modelo?: ModeloContrato }) {
  const router = useRouter();
  const toast = useToast();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [titulo, setTitulo] = useState(modelo?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaModeloContrato>((modelo?.categoria as CategoriaModeloContrato) ?? "emprestimo");
  const [mensagem, setMensagem] = useState(modelo?.mensagem ?? MODELOS_CONTRATO_PADRAO.find((m) => m.categoria === "emprestimo")!.mensagem);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

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
    if (!titulo.trim()) return toast("Informe um nome para o modelo.", "erro");
    if (!mensagem.trim()) return toast("Informe a mensagem do modelo.", "erro");
    setSalvando(true);
    const res = await fetch(modelo ? `/api/modelos-contrato/${modelo.id}` : "/api/modelos-contrato", {
      method: modelo ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, categoria, mensagem }),
    });
    setSalvando(false);
    if (!res.ok) return toast("Não foi possível salvar o modelo.", "erro");
    toast("Modelo salvo!");
    router.push("/modelos-contrato");
  }

  async function excluir() {
    if (!modelo) return;
    if (!window.confirm("Tem certeza que deseja excluir este modelo?")) return;
    setExcluindo(true);
    const res = await fetch(`/api/modelos-contrato/${modelo.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (!res.ok) return toast("Não foi possível excluir o modelo.", "erro");
    toast("Modelo excluído.");
    router.push("/modelos-contrato");
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">NOME DO MODELO</p>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Resumo do contrato" className="form-input w-full" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CATEGORIA</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS_MODELO_CONTRATO.map((c) => (
              <button key={c.valor} type="button" onClick={() => setCategoria(c.valor)} className={`chip-toggle ${categoria === c.valor ? "chip-toggle-ativo" : ""}`}>
                {c.icone} {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">MENSAGEM</p>
        <textarea ref={areaRef} value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="w-full min-h-[260px] rounded-md border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary resize-y" />
      </section>

      <section className="card">
        <p className="text-xs font-semibold tracking-wide text-muted">VARIÁVEIS DISPONÍVEIS</p>
        <p className="text-xs text-muted mt-2">Toque em uma variável para inseri-la na posição atual do texto.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {VARIAVEIS_MODELO_CONTRATO[categoria].map((variavel) => (
            <button key={variavel} onClick={() => inserirVariavel(variavel)} className="rounded-pill bg-muted-surface px-3 py-1.5 text-xs font-mono font-semibold">
              + {variavel}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="text-xs font-semibold tracking-wide text-muted">PRÉ-VISUALIZAÇÃO</p>
        <p className="text-xs text-muted mt-2">Usando dados de exemplo.</p>
        <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-6">{preencherModelo(mensagem, EXEMPLO_MODELO_CONTRATO[categoria])}</div>
      </section>

      <div className={modelo ? "grid grid-cols-[1fr_auto] gap-2" : ""}>
        <button onClick={salvar} disabled={salvando} className="btn-primary flex items-center justify-center gap-2">
          <IconCheck size={17} /> {salvando ? "Salvando..." : "Salvar"}
        </button>
        {modelo && (
          <button onClick={excluir} disabled={excluindo} className="btn-outline !w-auto !min-h-0 !py-3 flex items-center gap-2 text-error" style={{ borderColor: "var(--color-border-error)" }}>
            <IconTrash size={17} /> {excluindo ? "..." : "Excluir"}
          </button>
        )}
      </div>
    </div>
  );
}
