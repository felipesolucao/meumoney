// ============================================================================
// COMPONENTE: Ações do contrato (enviar cobrança, editar, excluir)
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./ToastProvider";
import { IconSend, IconTrash, IconHistory } from "./Icons";
import EnviarCobrancaModal from "./EnviarCobrancaModal";

export default function ContratoAcoes({
  contratoId,
  clienteNome,
  clienteTelefone,
  parcelas,
  valorTotal,
  multaAtraso,
  tipoMultaAtraso,
  valorMultaAtraso,
}: {
  contratoId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  parcelas: { numero: number; valor: string; vencimento: string; status: string }[];
  valorTotal: string;
  multaAtraso: boolean;
  tipoMultaAtraso: string | null;
  valorMultaAtraso: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [excluindo, setExcluindo] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);

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
    <div className="contract-actions space-y-3">
      <button onClick={() => setModalAberto(true)} className="btn-primary flex items-center justify-center gap-2">
        <IconSend size={18} /> Enviar cobrança
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
      <EnviarCobrancaModal aberto={modalAberto} onFechar={() => setModalAberto(false)} clienteNome={clienteNome} clienteTelefone={clienteTelefone} parcelas={parcelas} valorContrato={valorTotal} multaAtraso={multaAtraso} tipoMultaAtraso={tipoMultaAtraso} valorMultaAtraso={valorMultaAtraso} />
    </div>
  );
}
