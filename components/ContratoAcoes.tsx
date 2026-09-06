// ============================================================================
// COMPONENTE: Ações do contrato (enviar via WhatsApp, editar, excluir)
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatarMoeda, formatarData } from "../lib/calculos";
import { useToast } from "./ToastProvider";
import { IconSend, IconTrash, IconHistory } from "./Icons";

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
  const showToast = useToast();
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
    if (res.ok) {
      showToast("Contrato excluído.");
      router.push("/contratos");
    } else {
      showToast("Não foi possível excluir o contrato.", "erro");
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={enviarWhatsApp} className="btn-primary flex items-center justify-center gap-2">
        <IconSend size={18} /> Enviar contrato via WhatsApp
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={excluir}
          disabled={excluindo}
          className="btn-outline text-error flex items-center justify-center gap-2"
          style={{ borderColor: "var(--color-border-error)" }}
        >
          <IconTrash size={16} /> {excluindo ? "Excluindo..." : "Excluir"}
        </button>
        <Link
          href={`/historico?entidade=Contrato&voltar=/contratos/${contratoId}`}
          className="btn-outline flex items-center justify-center gap-2"
        >
          <IconHistory size={16} /> Histórico
        </Link>
      </div>
    </div>
  );
}
