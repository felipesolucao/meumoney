"use client";

import Link from "next/link";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { IconHome } from "../../../components/Icons";
import ModeloContratoForm from "../../../components/ModeloContratoForm";

export default function NovoModeloContratoPage() {
  return (
    <div>
      <header className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/modelos-contrato" />
        <Link href="/" className="icon-btn text-foreground" aria-label="Início"><IconHome size={19} /></Link>
        <div><h1 className="text-xl font-bold">Novo modelo</h1><p className="text-muted text-sm">Crie um modelo de contrato</p></div>
      </header>
      <main className="px-5 mt-5 pb-8">
        <ModeloContratoForm />
      </main>
    </div>
  );
}
