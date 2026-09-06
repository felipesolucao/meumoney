// ============================================================================
// COMPONENTE: Lista de lançamentos financeiros (receitas ou despesas)
// ----------------------------------------------------------------------------
// Reutilizado pelas telas de "Contas a pagar" e "Contas a receber" — só muda
// o filtro de tipo que a página passa por fora (ver app/financeiro/pagar e
// app/financeiro/receber).
//
// Pagar/Receber -> marca o lançamento como pago
// Reabrir       -> volta o lançamento para pendente (desfaz um pagamento)
// Excluir       -> remove só esta ocorrência, ou a série inteira se for uma
//                  conta fixa/parcelada (o usuário escolhe na confirmação)
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData, statusEfetivoLancamento } from "../lib/financeiro";
import Badge, { tomEStatusLancamento } from "./Badge";
import { IconWallet, IconReceipt, IconCheck, IconUndo, IconTrash } from "./Icons";

export type LancamentoItem = {
  id: string;
  descricao: string;
  valor: string;
  tipo: "receita" | "despesa";
  origem: "pessoal" | "empresarial";
  status: "pendente" | "pago";
  dataVencimento: string;
  numeroParcela: number | null;
  categoria: { nome: string; icone: string } | null;
  conta: { nome: string; icone: string } | null;
  recorrenteId: string | null;
};

export default function LancamentosLista({ lancamentos }: { lancamentos: LancamentoItem[] }) {
  const router = useRouter();
  const [carregandoId, setCarregandoId] = useState<string | null>(null);

  async function alternarStatus(item: LancamentoItem) {
    setCarregandoId(item.id);
    await fetch(`/api/lancamentos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: item.status === "pago" ? "reabrir" : "pagar" }),
    });
    setCarregandoId(null);
    router.refresh();
  }

  async function excluir(item: LancamentoItem) {
    let excluirSerie = false;
    if (item.recorrenteId) {
      excluirSerie = window.confirm(
        "Este lançamento faz parte de uma recorrência.\n\nOK = excluir TODA a série (fixa/parcelada)\nCancelar = excluir só esta ocorrência"
      );
      if (!excluirSerie) {
        const confirmaUnica = window.confirm("Excluir apenas esta ocorrência?");
        if (!confirmaUnica) return;
      }
    } else if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      return;
    }

    setCarregandoId(item.id);
    await fetch(`/api/lancamentos/${item.id}${excluirSerie ? "?serie=true" : ""}`, { method: "DELETE" });
    setCarregandoId(null);
    router.refresh();
  }

  if (lancamentos.length === 0) {
    return <div className="card text-center text-muted text-sm">Nenhum lançamento encontrado.</div>;
  }

  return (
    <div className="space-y-3">
      {lancamentos.map((item) => {
        const efetivo = statusEfetivoLancamento(item.status, item.dataVencimento);
        const { tom, texto } = tomEStatusLancamento(efetivo);
        const corValor = item.tipo === "receita" ? "text-primary" : "text-danger";
        const ocupado = carregandoId === item.id;

        return (
          <div key={item.id} className="card space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-xl flex-shrink-0">
                {item.categoria?.icone || (
                  <span className="text-primary">
                    {item.tipo === "receita" ? <IconWallet size={20} /> : <IconReceipt size={20} />}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold truncate">{item.descricao}</p>
                  <Badge tom={tom}>{texto}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {[item.categoria?.nome, item.conta?.nome, item.origem === "empresarial" ? "Empresarial" : "Pessoal"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted">Vence em {formatarData(item.dataVencimento)}</p>
                  <p className={`font-bold ${corValor}`}>
                    {item.tipo === "receita" ? "+" : "-"} {formatarMoeda(item.valor)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => alternarStatus(item)}
                disabled={ocupado}
                className={`flex items-center justify-center gap-1.5 ${
                  item.status === "pago" ? "btn-outline !py-2.5 text-sm" : "btn-primary !py-2.5 text-sm"
                }`}
              >
                {item.status === "pago" ? (
                  <>
                    <IconUndo size={16} /> Reabrir
                  </>
                ) : (
                  <>
                    <IconCheck size={16} /> {item.tipo === "receita" ? "Recebido" : "Pago"}
                  </>
                )}
              </button>
              <button
                onClick={() => excluir(item)}
                disabled={ocupado}
                className="btn-outline !py-2.5 text-sm text-danger flex items-center justify-center gap-1.5"
                style={{ borderColor: "#f4c7c2" }}
              >
                <IconTrash size={16} /> Excluir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
