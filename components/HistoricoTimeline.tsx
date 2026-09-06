// ============================================================================
// COMPONENTE: Timeline do histórico de ações do sistema
// ----------------------------------------------------------------------------
// Reutilizado tanto pela tela de Histórico do Financeiro (entidade=Lancamento)
// quanto pela tela de Histórico de Contratos (entidade=Contrato, que também
// traz as ações de Parcela — ver app/api/historico/route.ts).
//
// Cada linha mostra: ícone por tipo de ação, descrição, valor em destaque
// (verde = entrada, vermelho = saída) e a data. Ações já revertidas aparecem
// esmaecidas e riscadas, mas continuam visíveis (nunca somem da timeline).
// ============================================================================
"use client";

import { useState } from "react";
import { formatarMoeda } from "../lib/calculos";
import { useToast } from "./ToastProvider";
import { IconDocument, IconUser, IconCash, IconUndo } from "./Icons";

export type HistoricoItem = {
  id: string;
  tipo: string;
  entidade: "Contrato" | "Parcela" | "Cliente" | "Lancamento";
  descricao: string;
  valor: string | null;
  revertidoEm: string | null;
  origemId: string | null;
  criadoEm: string;
};

function iconePorEntidade(entidade: HistoricoItem["entidade"]) {
  switch (entidade) {
    case "Cliente":
      return <IconUser size={18} />;
    case "Contrato":
      return <IconDocument size={18} />;
    default:
      return <IconCash size={18} />;
  }
}

// Ações cuja reversão automática é parcial (por causa de exclusão em
// cascata) — mostramos um aviso extra na confirmação, mas o botão continua
// disponível, já que reverter parcialmente ainda é melhor que não reverter.
const AVISO_CASCATA = new Set(["CLIENTE_EXCLUIDO", "CONTRATO_EXCLUIDO", "LANCAMENTO_SERIE_EXCLUIDA"]);

export default function HistoricoTimeline({ itens }: { itens: HistoricoItem[] }) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [lista, setLista] = useState(itens);
  const showToast = useToast();

  async function reverter(item: HistoricoItem) {
    const avisoExtra = AVISO_CASCATA.has(item.tipo)
      ? "\n\nAtenção: esta ação apagou registros relacionados em cascata (ex: parcelas de um contrato). A reversão restaura o registro principal, mas não recria automaticamente tudo o que foi apagado em cascata."
      : "";
    const confirmou = window.confirm(`Reverter esta ação?\n\n"${item.descricao}"${avisoExtra}`);
    if (!confirmou) return;

    setProcessandoId(item.id);
    const res = await fetch(`/api/historico/${item.id}/reverter`, { method: "POST" });
    setProcessandoId(null);

    if (res.ok) {
      setLista((atual) =>
        atual.map((h) => (h.id === item.id ? { ...h, revertidoEm: new Date().toISOString() } : h))
      );
      showToast("Ação revertida com sucesso.");
    } else {
      const data = await res.json();
      showToast(data.error || "Não foi possível reverter esta ação.", "erro");
    }
  }

  if (lista.length === 0) {
    return <div className="card text-center text-muted text-sm">Nenhuma ação registrada ainda.</div>;
  }

  return (
    <div className="relative">
      {/* Linha vertical da timeline */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />

      <div className="space-y-4">
        {lista.map((item) => {
          const revertido = Boolean(item.revertidoEm);
          const valorNum = item.valor !== null ? Number(item.valor) : null;
          const corValor = valorNum === null ? "" : valorNum >= 0 ? "text-primary" : "text-danger";
          const ocupado = processandoId === item.id;

          return (
            <div key={item.id} className="relative flex gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  revertido ? "bg-gray-100 text-muted" : "bg-surface text-primary"
                }`}
              >
                {iconePorEntidade(item.entidade)}
              </div>

              <div className={`card flex-1 !py-3.5 ${revertido ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${revertido ? "line-through" : ""}`}>{item.descricao}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(item.criadoEm).toLocaleString("pt-BR")}
                      {revertido && " · Revertida"}
                    </p>
                  </div>
                  {valorNum !== null && (
                    <p className={`font-bold text-sm whitespace-nowrap ${corValor}`}>
                      {valorNum >= 0 ? "+ " : "- "}
                      {formatarMoeda(Math.abs(valorNum))}
                    </p>
                  )}
                </div>

                {!revertido && item.tipo !== "REVERSAO" && (
                  <button
                    onClick={() => reverter(item)}
                    disabled={ocupado}
                    className="btn-chip mt-3"
                    style={{ background: "#FDECC8", color: "#C98A1D" }}
                  >
                    <IconUndo size={14} /> {ocupado ? "Revertendo..." : "Reverter"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
