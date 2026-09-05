// ============================================================================
// COMPONENTE: Ações do contrato (enviar via WhatsApp, editar, excluir)
// ============================================================================
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData } from "../lib/calculos";

export default function ContratoAcoes({
  contratoId,
  codigo,
  clienteNome,
  clienteTelefone,
  valorTotal,
  numeroParcelas,
  primeiraParcelaData,
}: {
  contratoId: string;
  codigo: string;
  clienteNome: string;
  clienteTelefone: string | null;
  valorTotal: string;
  numeroParcelas: number;
  primeiraParcelaData: string;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  function enviarWhatsApp() {
    const mensagem = `Olá, ${clienteNome}! Segue o resumo do contrato ${codigo}: valor total ${formatarMoeda(
      valorTotal
    )} em ${numeroParcelas}x, primeira parcela em ${formatarData(primeiraParcelaData)}.`;
    const numero = (clienteTelefone || "").replace(/\D/g, "");
    const url = `https://wa.me/${numero ? `55${numero}` : ""}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  async function excluir() {
    if (!window.confirm("Tem certeza que deseja excluir este contrato? Essa ação não pode ser desfeita.")) return;
    setExcluindo(true);
    const res = await fetch(`/api/contratos/${contratoId}`, { method: "DELETE" });
    setExcluindo(false);
    if (res.ok) router.push("/contratos");
  }

  return (
    <div className="space-y-3">
      <button onClick={enviarWhatsApp} className="btn-primary flex items-center justify-center gap-2">
        ✈️ Enviar contrato via WhatsApp
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={excluir} disabled={excluindo} className="btn-outline text-danger" style={{ borderColor: "#f4c7c2" }}>
          🗑 {excluindo ? "Excluindo..." : "Excluir"}
        </button>
        <button onClick={() => router.push(`/contratos/${contratoId}`)} className="btn-outline">
          🔄 Atualizar
        </button>
      </div>
    </div>
  );
}
