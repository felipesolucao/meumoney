// ============================================================================
// COMPONENTE: Formulário de edição do nome (tela /perfil)
// ----------------------------------------------------------------------------
// E-mail e telefone só são exibidos (não dá pra editar por aqui — mudar
// e-mail de login é sensível o bastante para não caber num campo solto).
// Só o nome é editável, porque é o único dado usado na saudação/avatar do
// topo do app. Depois de salvar, router.refresh() faz o header (Server
// Component) reler a sessão e mostrar o nome novo imediatamente.
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { IconCheck } from "./Icons";

export default function PerfilFormulario({ nomeAtual }: { nomeAtual: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [nome, setNome] = useState(nomeAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const alterado = nome.trim() !== nomeAtual.trim() && nome.trim().length > 0;

  async function salvar() {
    if (!nome.trim()) return setErro("Informe um nome.");

    setErro("");
    setSalvando(true);
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    setSalvando(false);

    if (res.ok) {
      showToast("Nome atualizado com sucesso!");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "Não foi possível salvar. Tente novamente.");
      showToast(data.error || "Não foi possível salvar.", "erro");
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">NOME</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
        />
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando || !alterado}
        className="btn-primary flex items-center justify-center gap-2"
      >
        <IconCheck size={16} /> {salvando ? "Salvando..." : "Salvar alterações"}
      </button>
    </div>
  );
}
