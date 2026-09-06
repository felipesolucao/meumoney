// ============================================================================
// PÁGINA: Novo cliente (formulário)
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BotaoVoltar from "../../../components/BotaoVoltar";

export default function NovoCliente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [score, setScore] = useState("medio");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    setErro("");
    setSalvando(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, cpf, score }),
    });
    setSalvando(false);
    if (res.ok) {
      const cliente = await res.json();
      router.push(`/clientes/${cliente.id}`);
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar o cliente.");
    }
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/clientes" />
        <h1 className="text-2xl font-bold">Novo cliente</h1>
      </div>

      <div className="px-5 mt-6 space-y-5">
        <Campo label="NOME" value={nome} onChange={setNome} placeholder="Nome completo" />
        <Campo label="TELEFONE" value={telefone} onChange={setTelefone} placeholder="(62) 99999-9999" />
        <Campo label="CPF (OPCIONAL)" value={cpf} onChange={setCpf} placeholder="000.000.000-00" />

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">SCORE INICIAL</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { valor: "baixo", label: "Baixo" },
              { valor: "medio", label: "Médio" },
              { valor: "alto", label: "Alto" },
            ].map((opt) => (
              <button
                key={opt.valor}
                onClick={() => setScore(opt.valor)}
                className={score === opt.valor ? "btn-primary !py-3" : "btn-outline !py-3"}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-danger text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted mb-2">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
      />
    </div>
  );
}
