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
// Editar        -> abre EditarLancamentoModal (valor/vencimento se pendente,
//                  ou data do pagamento + "Estornar" se já pago — mesmo
//                  padrão das parcelas de contrato, ver ParcelasLista).
// Pagar/Receber -> abre ReceberLancamentoModal (data + valor, com suporte a
//                  pagamento parcial).
// Excluir       -> remove só esta ocorrência, ou a série inteira se for uma
//                  conta fixa/parcelada (o usuário escolhe na confirmação)
// Todas as ações acima ficam registradas no Histórico e podem ser revertidas
// por lá (ver /historico).
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarMoeda, statusEfetivoLancamento } from "../lib/financeiro";
import { agruparPorDia } from "../lib/calculos";
import Badge, { tomEStatusLancamento } from "./Badge";
import { useToast } from "./ToastProvider";
import EditarLancamentoModal from "./EditarLancamentoModal";
import ReceberLancamentoModal from "./ReceberLancamentoModal";
import { IconWallet, IconReceipt, IconCheck, IconTrash, IconEdit } from "./Icons";

export type LancamentoItem = {
  id: string;
  descricao: string;
  valor: string;
  valorPago?: string | null;
  tipo: "receita" | "despesa";
  origem: "pessoal" | "empresarial";
  status: "pendente" | "pago";
  dataVencimento: string;
  dataPagamento?: string | null;
  numeroParcela: number | null;
  categoria: { nome: string; icone: string } | null;
  conta: { nome: string; icone: string } | null;
  recorrenteId: string | null;
};

export default function LancamentosLista({
  lancamentos,
  aoAlterarStatus,
}: {
  lancamentos: LancamentoItem[];
  // Opcional: chamado com (id, novoStatus) assim que a API confirma que um
  // lançamento foi pago/reaberto. As telas que mantêm a lista em estado
  // local (Contas a pagar/receber) usam isso pra tirar/atualizar o item na
  // hora, em vez de esperar a página recarregar — ver comentário em
  // pagar()/estornar() logo abaixo. Quem não passa essa prop (ex: o
  // histórico dentro de categorias) mantém o comportamento antigo, só com
  // router.refresh().
  aoAlterarStatus?: (id: string, novoStatus: "pendente" | "pago") => void;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<LancamentoItem | null>(null);
  const [recebendo, setRecebendo] = useState<LancamentoItem | null>(null);

  const grupos = useMemo(
    () => agruparPorDia(lancamentos, (item) => item.dataVencimento),
    [lancamentos]
  );

  async function pagar(item: LancamentoItem, dataRecebimento: string, valorRecebido: number) {
    setCarregandoId(item.id);
    const res = await fetch(`/api/lancamentos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "pagar", dataRecebimento, valorRecebido }),
    });
    setCarregandoId(null);
    showToast(
      res.ok ? (item.tipo === "receita" ? "Recebimento registrado!" : "Pagamento registrado!") : "Não foi possível registrar.",
      res.ok ? "sucesso" : "erro"
    );
    if (res.ok) {
      setRecebendo(null);
      aoAlterarStatus?.(item.id, "pago");
    }
    router.refresh();
  }

  async function estornar(item: LancamentoItem) {
    setCarregandoId(item.id);
    const res = await fetch(`/api/lancamentos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "reabrir" }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Lançamento reaberto." : "Não foi possível reabrir o lançamento.", res.ok ? "sucesso" : "erro");
    if (res.ok) {
      setEditando(null);
      aoAlterarStatus?.(item.id, "pendente");
    }
    router.refresh();
  }

  async function editar(item: LancamentoItem, novoValor: number, novoVencimento: string) {
    setCarregandoId(item.id);
    const res = await fetch(`/api/lancamentos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor: novoValor, dataVencimento: novoVencimento }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Lançamento atualizado." : "Não foi possível atualizar o lançamento.", res.ok ? "sucesso" : "erro");
    if (res.ok) setEditando(null);
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
              const jaRecebido = Number(item.valorPago ?? 0);
              const parcial = item.status !== "pago" && jaRecebido > 0;
              const { tom, texto } = parcial ? { tom: "amber" as const, texto: "Pagamento parcial" } : tomEStatusLancamento(efetivo);
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
                        {item.tipo === "receita" ? "+" : "-"} {formatarMoeda(item.status === "pago" ? item.valorPago ?? item.valor : item.valor)}
                      </p>
                      {parcial && (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-primary)" }}>
                          {formatarMoeda(jaRecebido)} já {item.tipo === "receita" ? "recebido" : "pago"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`grid gap-2 ${item.status === "pago" ? "grid-cols-2" : "grid-cols-3"}`}>
                    <button
                      onClick={() => setEditando(item)}
                      disabled={ocupado}
                      className="btn-chip"
                      style={{ background: "var(--color-muted-surface)", color: "var(--color-foreground)" }}
                    >
                      <IconEdit size={14} /> Editar
                    </button>
                    {item.status !== "pago" && (
                      <button
                        onClick={() => setRecebendo(item)}
                        disabled={ocupado}
                        className="btn-chip btn-primary !min-h-0"
                      >
                        <IconCheck size={14} /> {item.tipo === "receita" ? "Recebido" : "Pago"}
                      </button>
                    )}
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

      <EditarLancamentoModal
        aberto={editando !== null}
        lancamento={editando}
        onFechar={() => setEditando(null)}
        onSalvar={async (valor, novoVencimento) => {
          if (editando) await editar(editando, valor, novoVencimento);
        }}
        onEstornar={async () => {
          if (editando) await estornar(editando);
        }}
      />

      <ReceberLancamentoModal
        aberto={recebendo !== null}
        lancamento={recebendo}
        onFechar={() => setRecebendo(null)}
        onConfirmar={async (data, valor) => {
          if (recebendo) await pagar(recebendo, data, valor);
        }}
      />
    </div>
  );
}
