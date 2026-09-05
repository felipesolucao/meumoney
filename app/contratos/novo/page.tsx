// ============================================================================
// PÁGINA: Novo contrato (formulário)
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { calcularContrato, formatarMoeda, Frequencia, TipoEmprestimo } from "../../../lib/calculos";

type Cliente = { id: string; nome: string };

export default function NovoContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteIdInicial = searchParams.get("clienteId") || "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState(clienteIdInicial);
  const [valorEmprestado, setValorEmprestado] = useState("");
  const [tipoEmprestimo, setTipoEmprestimo] = useState<TipoEmprestimo>("juros");
  const [jurosAoMes, setJurosAoMes] = useState("0");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [jurosAtraso, setJurosAtraso] = useState(false);
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(() => new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => {
        setClientes(data);
        if (!clienteIdInicial && data.length > 0) setClienteId(data[0].id);
      });
  }, [clienteIdInicial]);

  // --- Simulação em tempo real, igual à prévia que o usuário veria no app --
  const valorNum = parseFloat(valorEmprestado.replace(",", ".")) || 0;
  const jurosNum = parseFloat(jurosAoMes.replace(",", ".")) || 0;
  const parcelasNum = parseInt(numeroParcelas) || 1;
  const simulacao =
    valorNum > 0
      ? calcularContrato({
          valorEmprestado: valorNum,
          tipoEmprestimo,
          jurosAoMes: jurosNum,
          numeroParcelas: parcelasNum,
          frequencia,
          dataPrimeiraParcela: new Date(dataPrimeiraParcela),
        })
      : null;

  async function salvar() {
    if (!clienteId) return setErro("Selecione um cliente.");
    if (!valorNum) return setErro("Informe o valor emprestado.");
    if (!parcelasNum) return setErro("Informe o número de parcelas.");

    setErro("");
    setSalvando(true);
    const res = await fetch("/api/contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        valorEmprestado: valorNum,
        tipoEmprestimo,
        jurosAoMes: jurosNum,
        jurosAtraso,
        numeroParcelas: parcelasNum,
        frequencia,
        dataPrimeiraParcela,
      }),
    });
    setSalvando(false);
    if (res.ok) {
      const contrato = await res.json();
      router.push(`/contratos/${contrato.id}`);
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar o contrato.");
    }
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <Link href="/contratos" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
          ←
        </Link>
        <h1 className="text-2xl font-bold">Novo contrato</h1>
      </div>

      <div className="px-5 mt-6 space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CLIENTE</p>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary bg-white"
          >
            {clientes.length === 0 && <option value="">Nenhum cliente cadastrado</option>}
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {clientes.length === 0 && (
            <Link href="/clientes/novo" className="text-primary text-sm font-semibold mt-2 inline-block">
              + Cadastrar um cliente primeiro
            </Link>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR EMPRESTADO (R$)</p>
          <input
            value={valorEmprestado}
            onChange={(e) => setValorEmprestado(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">TIPO DE EMPRÉSTIMO</p>
          <div className="grid grid-cols-2 gap-2">
            <BotaoToggle ativo={tipoEmprestimo === "fixo"} onClick={() => setTipoEmprestimo("fixo")}>
              Valor Fixo
            </BotaoToggle>
            <BotaoToggle ativo={tipoEmprestimo === "juros"} onClick={() => setTipoEmprestimo("juros")}>
              Com Juros
            </BotaoToggle>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">JUROS % A.M.</p>
            <input
              value={jurosAoMes}
              onChange={(e) => setJurosAoMes(e.target.value)}
              disabled={tipoEmprestimo === "fixo"}
              inputMode="decimal"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary disabled:bg-gray-100"
            />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">Nº PARCELAS</p>
            <input
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        <label className="card flex items-center justify-between cursor-pointer">
          <span className="font-semibold">Cobrar juros em atraso</span>
          <input
            type="checkbox"
            checked={jurosAtraso}
            onChange={(e) => setJurosAtraso(e.target.checked)}
            className="w-6 h-6 accent-primary"
          />
        </label>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">FREQUÊNCIA DE PAGAMENTO</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { valor: "diaria", label: "Diária" },
                { valor: "semanal", label: "Semanal" },
                { valor: "quinzenal", label: "Quinzenal" },
                { valor: "mensal", label: "Mensal" },
              ] as { valor: Frequencia; label: string }[]
            ).map((opt) => (
              <BotaoToggle key={opt.valor} ativo={frequencia === opt.valor} onClick={() => setFrequencia(opt.valor)}>
                {opt.label}
              </BotaoToggle>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DA PRIMEIRA PARCELA</p>
          <input
            type="date"
            value={dataPrimeiraParcela}
            onChange={(e) => setDataPrimeiraParcela(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        {/* Prévia do cálculo, atualizada em tempo real */}
        {simulacao && (
          <div className="card space-y-1" style={{ background: "#eafaf0" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">RESUMO DO CONTRATO</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Valor total a receber</span>
              <span className="font-bold">{formatarMoeda(simulacao.valorTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Lucro estimado</span>
              <span className="font-bold text-primary">{formatarMoeda(simulacao.valorLucro)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Valor de cada parcela</span>
              <span className="font-bold">{formatarMoeda(simulacao.valorParcela)}</span>
            </div>
          </div>
        )}

        {erro && <p className="text-danger text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : "Criar contrato"}
        </button>
      </div>
    </div>
  );
}

function BotaoToggle({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={ativo ? "btn-primary !py-3.5" : "btn-outline !py-3.5"}>
      {children}
    </button>
  );
}
