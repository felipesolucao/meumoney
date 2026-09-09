"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BotaoVoltar from "../../components/BotaoVoltar";
import { IconDocument, IconEdit, IconHome, IconPlus, IconTrash } from "../../components/Icons";
import { useToast } from "../../components/ToastProvider";
import { CATEGORIAS_MODELO_CONTRATO } from "../../lib/modelosContrato";

type ModeloContrato = { id: string; titulo: string; categoria: string; mensagem: string };

export default function ModelosContratoPage() {
  const toast = useToast();
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/modelos-contrato")
      .then((r) => r.json())
      .then(setModelos)
      .catch(() => toast("Não foi possível carregar os modelos.", "erro"))
      .finally(() => setCarregando(false));
  }, [toast]);

  async function excluir(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este modelo?")) return;
    setExcluindoId(id);
    const res = await fetch(`/api/modelos-contrato/${id}`, { method: "DELETE" });
    setExcluindoId(null);
    if (!res.ok) return toast("Não foi possível excluir o modelo.", "erro");
    setModelos((atual) => atual.filter((m) => m.id !== id));
    toast("Modelo excluído.");
  }

  return (
    <div>
      <header className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/menu" />
        <Link href="/" className="icon-btn text-foreground" aria-label="Início"><IconHome size={19} /></Link>
        <div><h1 className="text-xl font-bold">Modelos de contrato</h1><p className="text-muted text-sm">Mensagens para o envio de contrato</p></div>
      </header>
      <main className="px-5 mt-5 space-y-3 pb-8">
        <Link href="/modelos-contrato/novo" className="btn-primary flex items-center justify-center gap-2">
          <IconPlus size={18} /> Criar novo modelo
        </Link>

        {carregando ? (
          <p className="text-sm text-muted py-8 text-center">Carregando modelos...</p>
        ) : modelos.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">Nenhum modelo cadastrado ainda.</p>
        ) : (
          modelos.map((modelo) => {
            const categoria = CATEGORIAS_MODELO_CONTRATO.find((c) => c.valor === modelo.categoria);
            return (
              <div key={modelo.id} className="card space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center text-primary shrink-0"><IconDocument size={20} /></div>
                  <div className="min-w-0">
                    <p className="font-bold">{modelo.titulo}</p>
                    <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-line">{modelo.mensagem}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/modelos-contrato/${modelo.id}/editar`} className="btn-outline-sm">
                    <IconEdit size={14} /> Editar
                  </Link>
                  <button
                    onClick={() => excluir(modelo.id)}
                    disabled={excluindoId === modelo.id}
                    className="btn-outline-sm text-error"
                    style={{ borderColor: "var(--color-border-error)" }}
                  >
                    <IconTrash size={14} /> {excluindoId === modelo.id ? "..." : "Excluir"}
                  </button>
                </div>
                {categoria && <p className="text-[11px] text-muted">{categoria.icone} {categoria.label}</p>}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
