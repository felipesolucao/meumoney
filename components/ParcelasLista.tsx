// ============================================================================
// COMPONENTE: Lista de parcelas de um contrato, com ações
// ----------------------------------------------------------------------------
// Cobrar     -> abre o WhatsApp com uma mensagem de cobrança pronta
// Editar     -> corrige valor e/ou vencimento da parcela (para erros de
//               digitação, sem precisar excluir/recriar o contrato inteiro)
// Renegociar -> pede uma nova data e atualiza o vencimento da parcela
// Pagar      -> marca a parcela como paga
// Todas as ações ficam registradas no Histórico do contrato e podem ser
// desfeitas por lá (ver /historico?entidade=Contrato).
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData, statusDaParcela } from "../lib/calculos";
import Badge, { tomEStatusParcela } from "./Badge";
import { IconChat, IconRefresh, IconCash, IconEdit } from "./Icons";

type Parcela = {
  id: string;
  numero: number;
  valor: string;
  vencimento: string;
  status: string;
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
  const [carregandoId, setCarregandoId] = useState<string | null>(null);

  async function pagar(id: string) {
    setCarregandoId(id);
    await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "pagar" }),
    });
    setCarregandoId(null);
    router.refresh();
  }

  async function renegociar(id: string, vencimentoAtual: string) {
    const novaData = window.prompt("Nova data de vencimento (dd/mm/aaaa):", formatarData(vencimentoAtual));
    if (!novaData) return;
    const isoData = converterParaIso(novaData);
    if (!isoData) return window.alert("Data inválida. Use o formato dd/mm/aaaa.");

    setCarregandoId(id);
    await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "renegociar", novoVencimento: isoData }),
    });
    setCarregandoId(null);
    router.refresh();
  }

  // Edição livre: corrige valor e/ou data, sem alterar o status da parcela.
  // Útil para erros de digitação (ex: valor com centavos trocados).
  async function editar(p: Parcela) {
    const novoValorStr = window.prompt("Valor da parcela (R$):", String(p.valor).replace(".", ","));
    if (novoValorStr === null) return;
    const novoValor = parseFloat(novoValorStr.replace(",", "."));
    if (!novoValor || novoValor <= 0) return window.alert("Valor inválido.");

    const novaDataStr = window.prompt("Data de vencimento (dd/mm/aaaa):", formatarData(p.vencimento));
    if (novaDataStr === null) return;
    const isoData = converterParaIso(novaDataStr);
    if (!isoData) return window.alert("Data inválida. Use o formato dd/mm/aaaa.");

    setCarregandoId(p.id);
    await fetch(`/api/parcelas/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "editar", valor: novoValor, novoVencimento: isoData }),
    });
    setCarregandoId(null);
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
    <div className="space-y-3">
      {parcelas.map((p) => {
        const efetivo = statusDaParcela(new Date(p.vencimento), p.status === "pago");
        const { tom, texto } = tomEStatusParcela(efetivo);
        const desabilitado = carregandoId === p.id;
        return (
          <div
            key={p.id}
            className="card"
            style={p.status === "pago" ? { borderLeft: "4px solid #2FA85A" } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ background: p.status === "pago" ? "#2FA85A" : "#f3d9a4" }}
              >
                {p.numero}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{formatarMoeda(p.valor)}</p>
                <p className="text-sm text-muted">Vence {formatarData(p.vencimento)}</p>
              </div>
              <Badge tom={tom}>{texto}</Badge>
              <button
                onClick={() => editar(p)}
                disabled={carregandoId === p.id}
                aria-label="Editar parcela"
                className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-shrink-0 text-muted"
              >
                <IconEdit size={15} />
              </button>
            </div>

            {p.status !== "pago" && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => cobrar(p)}
                  disabled={desabilitado}
                  className="btn-chip"
                  style={{ background: "#E3F5E9", color: "#2FA85A" }}
                >
                  <IconChat size={15} /> Cobrar
                </button>
                <button
                  onClick={() => renegociar(p.id, p.vencimento)}
                  disabled={desabilitado}
                  className="btn-chip"
                  style={{ background: "#FDECC8", color: "#C98A1D" }}
                >
                  <IconRefresh size={15} /> Renegociar
                </button>
                <button
                  onClick={() => pagar(p.id)}
                  disabled={desabilitado}
                  className="btn-chip text-white"
                  style={{ background: "linear-gradient(180deg,#45bd70,#268a4c)" }}
                >
                  <IconCash size={15} /> Pagar
                </button>
              </div>
            )}
          </div>
        );
      })}
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
