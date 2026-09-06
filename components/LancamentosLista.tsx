// ============================================================================
// COMPONENTE: Lista de lançamentos financeiros (receitas ou despesas)
// ----------------------------------------------------------------------------
// Reutilizado pelas telas de "Contas a pagar" e "Contas a receber" — só muda
// o filtro de tipo que a página passa por fora (ver app/financeiro/pagar e
// app/financeiro/receber).
//
// A lista chega já ordenada por data decrescente (mais recente primeiro) e
// aqui é agrupada por dia, no mesmo padrão do app de referência.
//
// Editar    -> abre a tela de edição do lançamento
// Pagar/Receber -> marca o lançamento como pago
// Reabrir   -> volta o lançamento para pendente (desfaz um pagamento)
// Excluir   -> remove só esta ocorrência, ou a série inteira se for uma
//              conta fixa/parcelada (o usuário escolhe na confirmação)
// Todas as ações acima ficam registradas no Histórico e podem ser revertidas
// por lá (ver /historico).
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatarMoeda, statusEfetivoLancamento } from "../lib/financeiro";
import { agruparPorDia } from "../lib/calculos";
import Badge, { tomEStatusLancamento } from "./Badge";
import { useToast } from "./ToastProvider";
import { IconWallet, IconReceipt, IconCheck, IconUndo, IconTrash, IconEdit } from "./Icons";

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
  const showToast = useToast();
  const [carregandoId, setCarregandoId] = useState<string | null>(null);

  const grupos = useMemo(
    () => agruparPorDia(lancamentos, (item) => item.dataVencimento),
    [lancamentos]
  );

  async function alternarStatus(item: LancamentoItem) {
    setCarregandoId(item.id);
    const res = await fetch(`/api/lancamentos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: item.status === "pago" ? "reabrir" : "pagar" }),
    });
    setCarregandoId(null);
    if (res.ok) {
      showToast(
        item.status === "pago"
          ? "Lançamento reaberto."
          : item.tipo === "receita"
          ? "Recebimento confirmado!"
          : "Pagamento confirmado!"
      );
    } else {
      showToast("Não foi possível atualizar o lançamento.", "erro");
    }
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
    const res = await fetch(`/api/lancamentos/${item.id}${excluirSerie ? "?serie=true" : ""}`, { method: "DELETE" });
    setCarregandoId(null);
    if (res.ok) {
      showToast("Lançamento excluído.");
    } else {
      showToast("Não foi possível excluir o lançamento.", "erro");
    }
    router.refresh();
  }

  if (lancamentos.length === 0) {
    return <div className="card text-center text-muted text-sm">Nenhum lançamento encontrado.</div>;
  }

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.rotulo}>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">{grupo.rotulo}</p>
          <div className="space-y-3">
            {grupo.itens.map((item) => {
              const efetivo = statusEfetivoLancamento(item.status, item.dataVencimento);
              const { tom, texto } = tomEStatusLancamento(efetivo);
              const corValor = item.tipo === "receita" ? "text-primary" : "text-error";
              const ocupado = carregandoId === item.id;

              return (
                <div key={item.id} className="card space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-xl flex-shrink-0">
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
                      <p className={`font-bold mt-1 ${corValor}`}>
                        {item.tipo === "receita" ? "+" : "-"} {formatarMoeda(item.valor)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      href={`/financeiro/${item.id}/editar`}
                      className="btn-chip"
                      style={{ background: "var(--color-muted-surface)", color: "var(--color-foreground)" }}
                    >
                      <IconEdit size={14} /> Editar
                    </Link>
                    <button
                      onClick={() => alternarStatus(item)}
                      disabled={ocupado}
                      className={`btn-chip ${item.status === "pago" ? "btn-outline !min-h-0" : "btn-primary !min-h-0"}`}
                    >
                      {item.status === "pago" ? (
                        <>
                          <IconUndo size={14} /> Reabrir
                        </>
                      ) : (
                        <>
                          <IconCheck size={14} /> {item.tipo === "receita" ? "Recebido" : "Pago"}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => excluir(item)}
                      disabled={ocupado}
                      className="btn-chip text-error"
                      style={{ background: "var(--color-error-subtle)" }}
                    >
                      <IconTrash size={14} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
