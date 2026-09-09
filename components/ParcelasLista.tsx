// ============================================================================
// COMPONENTE: Lista de parcelas de um contrato, com ações
// ----------------------------------------------------------------------------
// Mesmo padrão visual de cartão usado em /parcelas (badge numerado
// arredondado, valor em destaque, Badge de status, linha de vencimento/
// prazo) — ver app/parcelas/page.tsx.
//
// Cobrar     -> abre o WhatsApp com uma mensagem de cobrança pronta
// Editar (ícone lápis) -> abre EditarParcelaModal: corrige valor/vencimento
//               se ainda não paga, ou mostra a data do pagamento + botão
//               "Estornar" se já paga (antes esse botão ficava solto no
//               card — ver comentário em EditarParcelaModal.tsx).
// Renegociar -> pede uma nova data e atualiza o vencimento da parcela
// Pagar      -> abre ReceberPagamentoModal (data + valor recebido, com
//               suporte a pagamento parcial — ver esse componente).
// Todas as ações ficam registradas no Histórico do contrato e podem ser
// desfeitas por lá (ver /historico?entidade=Contrato).
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData, statusDaParcela } from "../lib/calculos";
import Badge, { tomEStatusParcela } from "./Badge";
import { useToast } from "./ToastProvider";
import EditarParcelaModal from "./EditarParcelaModal";
import ReceberPagamentoModal from "./ReceberPagamentoModal";
import { IconChat, IconRefresh, IconCash, IconEdit } from "./Icons";

type Parcela = {
  id: string;
  numero: number;
  valor: string;
  valorPago?: string | null;
  vencimento: string;
  status: string;
  pagoEm?: string | null;
};

export default function ParcelasLista({
  parcelas,
  clienteNome,
  clienteTelefone,
  codigoContrato,
}: {
  parcelas: Parcela[];
  clienteNome: string;
  clienteTelefone: string | null;
  codigoContrato: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [parcelaEditando, setParcelaEditando] = useState<Parcela | null>(null);
  const [parcelaRecebendo, setParcelaRecebendo] = useState<Parcela | null>(null);

  async function pagar(id: string, dataRecebimento: string, valorRecebido: number) {
    setCarregandoId(id);
    const res = await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "pagar", dataRecebimento, valorRecebido }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Pagamento registrado!" : "Não foi possível registrar o pagamento.", res.ok ? "sucesso" : "erro");
    if (res.ok) setParcelaRecebendo(null);
    router.refresh();
  }

  async function estornar(id: string) {
    setCarregandoId(id);
    const res = await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "reabrir" }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Pagamento estornado." : "Não foi possível estornar o pagamento.", res.ok ? "sucesso" : "erro");
    if (res.ok) setParcelaEditando(null);
    router.refresh();
  }

  async function renegociar(id: string, vencimentoAtual: string) {
    const novaData = window.prompt("Nova data de vencimento (dd/mm/aaaa):", formatarData(vencimentoAtual));
    if (!novaData) return;
    const isoData = converterParaIso(novaData);
    if (!isoData) return window.alert("Data inválida. Use o formato dd/mm/aaaa.");

    setCarregandoId(id);
    const res = await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "renegociar", novoVencimento: isoData }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Parcela renegociada." : "Não foi possível renegociar a parcela.", res.ok ? "sucesso" : "erro");
    router.refresh();
  }

  // Edição livre: corrige valor e/ou data, sem alterar o status da parcela.
  // Útil para erros de digitação (ex: valor com centavos trocados).
  async function editar(id: string, novoValor: number, novoVencimento: string) {
    setCarregandoId(id);
    const res = await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "editar", valor: novoValor, novoVencimento }),
    });
    setCarregandoId(null);
    showToast(res.ok ? "Parcela atualizada." : "Não foi possível atualizar a parcela.", res.ok ? "sucesso" : "erro");
    if (res.ok) setParcelaEditando(null);
    router.refresh();
  }

  function cobrar(parcela: Parcela) {
    const mensagem = `Olá, ${clienteNome}! Passando para lembrar da parcela ${parcela.numero} do contrato ${codigoContrato}, no valor de ${formatarMoeda(
      parcela.valor
    )}, com vencimento em ${formatarData(parcela.vencimento)}.`;
    const numero = (clienteTelefone || "").replace(/\D/g, "");
    const url = `https://wa.me/${numero ? `55${numero}` : ""}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="contract-installments space-y-3">
      {parcelas.map((p) => {
        const paga = p.status === "pago";
        const jaRecebido = Number(p.valorPago ?? 0);
        const parcial = !paga && jaRecebido > 0;
        const efetivo = statusDaParcela(new Date(p.vencimento), paga);
        const { tom, texto } = parcial ? { tom: "amber" as const, texto: "Pagamento parcial" } : tomEStatusParcela(efetivo);
        const desabilitado = carregandoId === p.id;

        return (
          <div key={p.id} className="card border border-border">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                style={{
                  background: paga ? "var(--color-success-subtle)" : "var(--color-warning-subtle)",
                  color: paga ? "var(--color-success)" : "var(--color-warning)",
                }}
              >
                {p.numero}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg tabular-nums">{formatarMoeda(paga ? p.valorPago ?? p.valor : p.valor)}</p>
                {paga ? (
                  <p className="text-sm text-muted mt-0.5">Pago em {formatarData(p.pagoEm ?? p.vencimento)}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted mt-0.5">Vence {formatarData(p.vencimento)}</p>
                    {parcial && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-primary)" }}>
                        {formatarMoeda(jaRecebido)} já recebido
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Badge tom={tom}>{texto}</Badge>
                <button
                  onClick={() => setParcelaEditando(p)}
                  disabled={desabilitado}
                  aria-label="Editar parcela"
                  className="w-8 h-8 rounded-pill bg-background flex items-center justify-center text-muted"
                >
                  <IconEdit size={14} />
                </button>
              </div>
            </div>

            {!paga && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => cobrar(p)}
                  disabled={desabilitado}
                  className="btn-chip-sm"
                  style={{ background: "var(--color-success-subtle)", color: "var(--color-success)" }}
                >
                  <IconChat size={14} /> Cobrar
                </button>
                <button
                  onClick={() => renegociar(p.id, p.vencimento)}
                  disabled={desabilitado}
                  className="btn-chip-sm"
                  style={{ background: "var(--color-warning-subtle)", color: "var(--color-warning)" }}
                >
                  <IconRefresh size={14} /> Renegociar
                </button>
                <button
                  onClick={() => setParcelaRecebendo(p)}
                  disabled={desabilitado}
                  className="btn-chip-sm text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <IconCash size={14} /> Pagar
                </button>
              </div>
            )}
          </div>
        );
      })}

      <EditarParcelaModal
        aberto={parcelaEditando !== null}
        parcela={parcelaEditando}
        onFechar={() => setParcelaEditando(null)}
        onSalvar={async (valor, novoVencimento) => {
          if (parcelaEditando) await editar(parcelaEditando.id, valor, novoVencimento);
        }}
        onEstornar={async () => {
          if (parcelaEditando) await estornar(parcelaEditando.id);
        }}
      />

      <ReceberPagamentoModal
        aberto={parcelaRecebendo !== null}
        parcela={parcelaRecebendo}
        clienteNome={clienteNome}
        codigoContrato={codigoContrato}
        onFechar={() => setParcelaRecebendo(null)}
        onConfirmar={async (data, valor) => {
          if (parcelaRecebendo) await pagar(parcelaRecebendo.id, data, valor);
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Converte "dd/mm/aaaa" em "aaaa-mm-dd" (formato aceito pela API). Retorna
// null se o texto não tiver o formato esperado.
// ----------------------------------------------------------------------------
function converterParaIso(data: string): string | null {
  const partes = data.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  if (!dia || !mes || !ano) return null;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}
