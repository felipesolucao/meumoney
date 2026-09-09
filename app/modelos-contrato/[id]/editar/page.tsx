"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import { IconHome } from "../../../../components/Icons";
import ModeloContratoForm from "../../../../components/ModeloContratoForm";
import { useToast } from "../../../../components/ToastProvider";

type ModeloContrato = { id: string; titulo: string; categoria: string; mensagem: string };

export default function EditarModeloContratoPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [modelo, setModelo] = useState<ModeloContrato | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/modelos-contrato")
      .then((r) => r.json())
      .then((dados: ModeloContrato[]) => setModelo(dados.find((m) => m.id === id) ?? null))
      .catch(() => toast("Não foi possível carregar o modelo.", "erro"))
      .finally(() => setCarregando(false));
  }, [id, toast]);

  return (
    <div>
      <header className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/modelos-contrato" />
        <Link href="/" className="icon-btn text-foreground" aria-label="Início"><IconHome size={19} /></Link>
        <div><h1 className="text-xl font-bold">Editar modelo</h1><p className="text-muted text-sm">Personalize a mensagem do contrato</p></div>
      </header>
      <main className="px-5 mt-5 pb-8">
        {carregando ? (
          <p className="text-sm text-muted py-8 text-center">Carregando modelo...</p>
        ) : !modelo ? (
          <p className="text-sm text-muted py-8 text-center">Modelo não encontrado.</p>
        ) : (
          <ModeloContratoForm modelo={modelo} />
        )}
      </main>
    </div>
  );
}
