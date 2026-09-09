// ============================================================================
// COMPONENTE: Ações do contrato (enviar cobrança, editar, excluir)
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Frequencia, TipoEmprestimo } from "../lib/calculos";
import { useToast } from "./ToastProvider";
import { IconSend, IconTrash, IconHistory, IconEdit, IconDocument } from "./Icons";
import EnviarCobrancaModal from "./EnviarCobrancaModal";
import EnviarResumoContratoModal from "./EnviarResumoContratoModal";

export default function ContratoAcoes({
  contratoId,
  clienteNome,
  clienteTelefone,
  parcelas,
  valorTotal,
  multaAtraso,
  tipoMultaAtraso,
  valorMultaAtraso,
  valorEmprestado,
  tipoEmprestimo,
  jurosAoMes,
  frequencia,
  numeroParcelas,
  dataPrimeiraParcela,
}: {
  contratoId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  parcelas: { numero: number; valor: string; vencimento: string; status: string }[];
  valorTotal: string;
  multaAtraso: boolean;
  tipoMultaAtraso: string | null;
  valorMultaAtraso: string;
  valorEmprestado: string;
  tipoEmprestimo: TipoEmprestimo;
  jurosAoMes: string;
  frequencia: Frequencia;
  numeroParcelas: number;
  dataPrimeiraParcela: string;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [excluindo, setExcluindo] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);
  const primeiraParcela = parcelas[0];

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
    <div className="contract-actions space-y-2.5">
      <button onClick={() => setModalAberto(true)} className="btn-primary-sm w-full">
        <IconSend size={16} /> Enviar cobrança
      </button>
      <button onClick={() => setModalResumoAberto(true)} className="btn-outline-sm w-full">
        <IconDocument size={16} /> Enviar resumo do contrato
      </button>
      <div className="grid grid-cols-3 gap-2">
        <Link href={`/contratos/${contratoId}/editar`} className="btn-outline-sm">
          <IconEdit size={14} /> Editar
        </Link>
        <Link href={`/historico?entidade=Contrato&voltar=/contratos/${contratoId}`} className="btn-outline-sm">
          <IconHistory size={14} /> Histórico
        </Link>
        <button
          onClick={excluir}
          disabled={excluindo}
          className="btn-outline-sm text-error"
          style={{ borderColor: "var(--color-border-error)" }}
        >
          <IconTrash size={14} /> {excluindo ? "..." : "Excluir"}
        </button>
      </div>
      <EnviarCobrancaModal aberto={modalAberto} onFechar={() => setModalAberto(false)} clienteNome={clienteNome} clienteTelefone={clienteTelefone} parcelas={parcelas} valorContrato={valorTotal} multaAtraso={multaAtraso} tipoMultaAtraso={tipoMultaAtraso} valorMultaAtraso={valorMultaAtraso} />
      <EnviarResumoContratoModal
        aberto={modalResumoAberto}
        onFechar={() => setModalResumoAberto(false)}
        clienteNome={clienteNome}
        clienteTelefone={clienteTelefone}
        parcelas={parcelas}
        valorEmprestado={valorEmprestado}
        tipoEmprestimo={tipoEmprestimo}
        jurosAoMes={jurosAoMes}
        frequencia={frequencia}
        numeroParcelas={numeroParcelas}
        valorParcela={primeiraParcela?.valor ?? "0"}
        dataPrimeiraParcela={dataPrimeiraParcela}
        totalReceber={valorTotal}
      />
    </div>
  );
}
