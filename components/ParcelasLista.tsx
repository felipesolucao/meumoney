// ============================================================================
// COMPONENTE: Lista de parcelas de um contrato, com ações
// ----------------------------------------------------------------------------
// Cobrar    -> abre o WhatsApp com uma mensagem de cobrança pronta
// Renegociar -> pede uma nova data e atualiza o vencimento da parcela
// Pagar     -> marca a parcela como paga
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData, statusDaParcela } from "../lib/calculos";
import Badge, { tomEStatusParcela } from "./Badge";

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
    const partes = novaData.split("/");
    if (partes.length !== 3) return window.alert("Data inválida. Use o formato dd/mm/aaaa.");
    const isoData = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;

    setCarregandoId(id);
    await fetch(`/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "renegociar", novoVencimento: isoData }),
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
        const desabilitado = carregandoId === p.id || p.status === "pago";
        return (
          <div
            key={p.id}
            className="card"
            style={p.status === "pago" ? { borderLeft: "4px solid #2FA85A" } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white"
                style={{ background: p.status === "pago" ? "#2FA85A" : "#f3d9a4" }}
              >
                {p.numero}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{formatarMoeda(p.valor)}</p>
                <p className="text-sm text-muted">Vence {formatarData(p.vencimento)}</p>
              </div>
              <Badge tom={tom}>{texto}</Badge>
            </div>

            {p.status !== "pago" && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={() => cobrar(p)}
                  disabled={desabilitado}
                  className="rounded-pill text-sm font-semibold py-2.5"
                  style={{ background: "#E3F5E9", color: "#2FA85A" }}
                >
                  💬 Cobrar
                </button>
                <button
                  onClick={() => renegociar(p.id, p.vencimento)}
                  disabled={desabilitado}
                  className="rounded-pill text-sm font-semibold py-2.5"
                  style={{ background: "#FDECC8", color: "#C98A1D" }}
                >
                  🔄 Renegociar
                </button>
                <button
                  onClick={() => pagar(p.id)}
                  disabled={desabilitado}
                  className="rounded-pill text-sm font-semibold py-2.5 text-white"
                  style={{ background: "linear-gradient(180deg,#45bd70,#268a4c)" }}
                >
                  💵 Pagar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
