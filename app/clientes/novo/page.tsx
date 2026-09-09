// ============================================================================
// PÁGINA: Novo cliente (formulário)
// ----------------------------------------------------------------------------
// Aceita ?voltar=/contratos/novo — usado pelo seletor de cliente de "Novo
// contrato" (ver app/contratos/novo/page.tsx), que manda pra cá quando o
// usuário toca em "+ Adicionar cliente" no meio do cadastro do contrato.
// Com esse parâmetro, salvar aqui volta pra lá já com ?clienteId=<novo id>
// em vez de ir para o perfil do cliente — sem "voltar" o comportamento
// continua o de sempre.
//
// useSearchParams() exige um <Suspense> ao redor quando a página é
// pré-renderizada no build (mesmo motivo de app/historico/page.tsx), por
// isso a lógica fica num componente filho e a exportação padrão só monta
// o Suspense em volta dele.
// ============================================================================
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { useToast } from "../../../components/ToastProvider";

function NovoClienteConteudo() {
  const router = useRouter();
  const showToast = useToast();
  const searchParams = useSearchParams();
  const voltar = searchParams.get("voltar");

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
      showToast("Cliente cadastrado com sucesso!");
      if (voltar) {
        const separador = voltar.includes("?") ? "&" : "?";
        router.push(`${voltar}${separador}clienteId=${cliente.id}`);
      } else {
        router.push(`/clientes/${cliente.id}`);
      }
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar o cliente.");
      showToast(data.error || "Não foi possível salvar o cliente.", "erro");
    }
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={voltar || "/clientes"} />
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

        {erro && <p className="text-error text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
      </div>
    </div>
  );
}

export default function NovoCliente() {
  return (
    <Suspense fallback={<div className="px-5 pt-10 text-center text-muted">Carregando...</div>}>
      <NovoClienteConteudo />
    </Suspense>
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
        className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
      />
    </div>
  );
}
