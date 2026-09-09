// ============================================================================
// PÁGINA: Novo contrato (formulário)
// ============================================================================
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { calcularParcelasDoContrato, formatarMoeda, Frequencia, TipoEmprestimo } from "../../../lib/calculos";
import BotaoVoltar from "../../../components/BotaoVoltar";
import SeletorClienteBusca from "../../../components/SeletorClienteBusca";
import CampoMoeda, { valorFormatadoParaNumero } from "../../../components/CampoMoeda";
import { IconHome } from "../../../components/Icons";

type Cliente = { id: string; nome: string };
type Conta = { id: string; nome: string; icone: string; saldoAtual: number };

// O Next.js exige que qualquer componente que use useSearchParams() esteja
// dentro de um <Suspense>, senão a geração estática da página falha no build.
export default function NovoContratoPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-10 text-center text-muted">Carregando...</div>}>
      <NovoContrato />
    </Suspense>
  );
}

function NovoContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteIdInicial = searchParams.get("clienteId") || "";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState(clienteIdInicial);
  const [contas, setContas] = useState<Conta[]>([]);
  const [descontarConta, setDescontarConta] = useState(false);
  const [contaDesembolsoId, setContaDesembolsoId] = useState("");
  const [valorEmprestado, setValorEmprestado] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [temEntrada, setTemEntrada] = useState(false);
  const [dataEntrada, setDataEntrada] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoEmprestimo, setTipoEmprestimo] = useState<TipoEmprestimo>("juros");
  const [jurosAoMes, setJurosAoMes] = useState("0");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [jurosAtraso, setJurosAtraso] = useState(false);
  const [tipoJurosAtraso, setTipoJurosAtraso] = useState<"fixo" | "percentual">("percentual");
  const [valorJurosAtraso, setValorJurosAtraso] = useState("");
  const [frequenciaJurosAtraso, setFrequenciaJurosAtraso] = useState<"diaria" | "semanal" | "mensal">("mensal");
  const [multaAtraso, setMultaAtraso] = useState(false);
  const [tipoMultaAtraso, setTipoMultaAtraso] = useState<"fixa" | "percentual">("fixa");
  const [valorMultaAtraso, setValorMultaAtraso] = useState("");
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(() => new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data: Cliente[]) => setClientes(data));
  }, []);

  // Contas bancárias, para o bloco "Descontar da conta" — já vêm com o
  // saldo atual calculado (ver app/api/financeiro/contas-resumo/route.ts).
  useEffect(() => {
    fetch("/api/financeiro/contas-resumo")
      .then((r) => r.json())
      .then((data: { contas: Conta[] }) => setContas(data.contas));
  }, []);

  // --- Simulação em tempo real, igual à prévia que o usuário veria no app --
  const valorNum = valorFormatadoParaNumero(valorEmprestado);
  const entradaNum = temEntrada ? valorFormatadoParaNumero(valorEntrada) : 0;
  const jurosNum = parseFloat(jurosAoMes.replace(",", ".")) || 0;
  const parcelasNum = parseInt(numeroParcelas) || 1;
  const simulacao = valorNum > 0 && (!temEntrada || (entradaNum > 0 && entradaNum < valorNum && parcelasNum > 1))
    ? calcularParcelasDoContrato({ valorContrato: valorNum, valorEntrada: entradaNum, numeroParcelas: parcelasNum, frequencia, dataEntrada: new Date(dataEntrada), dataPrimeiraParcela: new Date(dataPrimeiraParcela) })
    : null;

  async function salvar() {
    if (!clienteId) return setErro("Selecione um cliente.");
    if (!valorNum) return setErro("Informe o valor do contrato.");
    if (temEntrada && (!entradaNum || entradaNum >= valorNum)) return setErro("Informe uma entrada menor que o valor do contrato.");
    if (jurosAtraso && !(tipoJurosAtraso === "fixo" ? valorFormatadoParaNumero(valorJurosAtraso) : Number(valorJurosAtraso.replace(",", ".")))) return setErro("Informe o valor dos juros por atraso.");
    if (multaAtraso && !valorFormatadoParaNumero(valorMultaAtraso)) return setErro("Informe o valor da multa por atraso.");
    if (!parcelasNum) return setErro("Informe o número de parcelas.");
    if (descontarConta && !contaDesembolsoId) return setErro("Selecione a conta bancária para descontar o valor.");

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
        tipoJurosAtraso: jurosAtraso ? tipoJurosAtraso : undefined,
        valorJurosAtraso: jurosAtraso ? (tipoJurosAtraso === "fixo" ? valorFormatadoParaNumero(valorJurosAtraso) : Number(valorJurosAtraso.replace(",", "."))) : undefined,
        frequenciaJurosAtraso: jurosAtraso ? frequenciaJurosAtraso : undefined,
        multaAtraso,
        tipoMultaAtraso,
        valorMultaAtraso: tipoMultaAtraso === "fixa" ? valorFormatadoParaNumero(valorMultaAtraso) : Number(valorMultaAtraso.replace(",", ".")),
        valorEntrada: entradaNum,
        dataEntrada: temEntrada ? dataEntrada : undefined,
        numeroParcelas: parcelasNum,
        frequencia,
        dataPrimeiraParcela,
        contaDesembolsoId: descontarConta ? contaDesembolsoId : undefined,
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
        <BotaoVoltar href="/contratos" />
        <Link href="/" aria-label="Ir para o início" className="desktop-home icon-btn text-foreground"><IconHome size={19} /></Link>
        <h1 className="text-2xl font-bold">Novo contrato</h1>
      </div>

      <div className="contract-form px-5 mt-6 space-y-5 overflow-x-hidden">
        <label className="card flex min-w-0 items-center justify-between gap-3 cursor-pointer">
          <span className="min-w-0"><span className="font-semibold block">Descontar de uma conta</span><span className="text-xs text-muted block truncate">O valor emprestado sai do saldo agora e volta conforme as parcelas forem pagas</span></span>
          <input type="checkbox" checked={descontarConta} onChange={(e) => setDescontarConta(e.target.checked)} className="w-6 h-6 accent-primary" />
        </label>

        {descontarConta && (
          <div className="card space-y-3" style={{ background: "var(--color-primary-surface)" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">CONTA BANCÁRIA</p>
            {contas.length === 0 ? (
              <p className="text-sm text-muted">
                Nenhuma conta cadastrada.{" "}
                <Link href="/financeiro/contas" className="text-primary font-semibold">Cadastrar conta</Link>
              </p>
            ) : (
              <select value={contaDesembolsoId} onChange={(e) => setContaDesembolsoId(e.target.value)} className="form-input w-full">
                <option value="">Selecione a conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icone} {c.nome} · {formatarMoeda(c.saldoAtual)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <SeletorClienteBusca
          clientes={clientes}
          clienteId={clienteId}
          onSelecionar={setClienteId}
          linkAdicionar="/clientes/novo?voltar=/contratos/novo"
        />

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR DO CONTRATO</p>
          <CampoMoeda value={valorEmprestado} onChange={setValorEmprestado} />
        </div>

        <label className="card flex min-w-0 items-center justify-between gap-3 cursor-pointer">
          <span className="min-w-0"><span className="font-semibold block">Possui entrada</span><span className="text-xs text-muted block truncate">Será a 1ª parcela do contrato</span></span>
          <input type="checkbox" checked={temEntrada} onChange={(e) => setTemEntrada(e.target.checked)} className="w-6 h-6 accent-primary" />
        </label>

        {temEntrada && <div className="card space-y-4" style={{ background: "var(--color-primary-surface)" }}>
          <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR DA ENTRADA</p><CampoMoeda value={valorEntrada} onChange={setValorEntrada} /></div>
          <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DA ENTRADA</p><input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="form-input form-date-input" /></div>
        </div>}

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">TIPO DE CONTRATO</p>
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
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">JUROS % A.M.</p>
            <input
              value={jurosAoMes}
              onChange={(e) => setJurosAoMes(e.target.value)}
              disabled={tipoEmprestimo === "fixo"}
              inputMode="decimal"
              className="form-input disabled:bg-muted-bg"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">TOTAL DE PARCELAS</p>
            <input
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
              inputMode="numeric"
              className="form-input"
            />
          </div>
        </div>

        <label className="card flex min-w-0 items-center justify-between gap-3 cursor-pointer">
          <span className="min-w-0"><span className="font-semibold block">Cobrar juros em atraso</span><span className="text-xs text-muted block truncate">Defina a cobrança quando houver atraso</span></span>
          <input
            type="checkbox"
            checked={jurosAtraso}
            onChange={(e) => setJurosAtraso(e.target.checked)}
            className="w-6 h-6 accent-primary"
          />
        </label>

        {jurosAtraso && <div className="card space-y-4" style={{ background: "var(--color-primary-surface)" }}>
          <p className="text-xs font-semibold tracking-wide text-muted">JUROS POR ATRASO</p>
          <div className="grid grid-cols-2 gap-2">
            <BotaoToggle ativo={tipoJurosAtraso === "percentual"} onClick={() => setTipoJurosAtraso("percentual")}>Percentual</BotaoToggle>
            <BotaoToggle ativo={tipoJurosAtraso === "fixo"} onClick={() => setTipoJurosAtraso("fixo")}>Valor fixo</BotaoToggle>
          </div>
          {tipoJurosAtraso === "fixo" ? <CampoMoeda value={valorJurosAtraso} onChange={setValorJurosAtraso} /> : <input value={valorJurosAtraso} onChange={(e) => setValorJurosAtraso(e.target.value.replace(/[^0-9,]/g, ""))} inputMode="decimal" placeholder="Ex.: 2,5%" className="form-input" />}
          <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">FREQUÊNCIA DA COBRANÇA</p><div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2"><BotaoToggle ativo={frequenciaJurosAtraso === "diaria"} onClick={() => setFrequenciaJurosAtraso("diaria")}>Por dia</BotaoToggle><BotaoToggle ativo={frequenciaJurosAtraso === "semanal"} onClick={() => setFrequenciaJurosAtraso("semanal")}>Por semana</BotaoToggle><BotaoToggle ativo={frequenciaJurosAtraso === "mensal"} onClick={() => setFrequenciaJurosAtraso("mensal")}>Por mês</BotaoToggle></div></div>
        </div>}

        <label className="card flex min-w-0 items-center justify-between gap-3 cursor-pointer">
          <span className="min-w-0"><span className="font-semibold block">Multa por atraso</span><span className="text-xs text-muted block truncate">Aplicada uma vez na parcela vencida</span></span>
          <input type="checkbox" checked={multaAtraso} onChange={(e) => setMultaAtraso(e.target.checked)} className="w-6 h-6 accent-primary" />
        </label>

        {multaAtraso && <div className="card space-y-3" style={{ background: "var(--color-warning-subtle)" }}>
          <p className="text-xs font-semibold tracking-wide text-muted">TIPO E VALOR DA MULTA</p>
          <div className="grid grid-cols-2 gap-2"><BotaoToggle ativo={tipoMultaAtraso === "fixa"} onClick={() => setTipoMultaAtraso("fixa")}>Valor fixo</BotaoToggle><BotaoToggle ativo={tipoMultaAtraso === "percentual"} onClick={() => setTipoMultaAtraso("percentual")}>% do contrato</BotaoToggle></div>
          {tipoMultaAtraso === "fixa" ? <CampoMoeda value={valorMultaAtraso} onChange={setValorMultaAtraso} /> : <input value={valorMultaAtraso} onChange={(e) => setValorMultaAtraso(e.target.value.replace(/[^0-9,]/g, ""))} inputMode="decimal" placeholder="Ex.: 2,5" className="form-input" />}
        </div>}

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
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">{temEntrada ? "DATA DA 2ª PARCELA" : "DATA DA PRIMEIRA PARCELA"}</p>
          <input
            type="date"
            value={dataPrimeiraParcela}
            onChange={(e) => setDataPrimeiraParcela(e.target.value)}
            className="form-input form-date-input"
          />
        </div>

        {/* Prévia do cálculo, atualizada em tempo real */}
        {simulacao && (
          <div className="card space-y-1" style={{ background: "var(--color-primary-surface)" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">RESUMO DO CONTRATO</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Valor do contrato</span>
              <span className="font-bold">{formatarMoeda(valorNum)}</span>
            </div>
            {temEntrada && <><div className="flex justify-between text-sm"><span className="text-muted">1ª parcela · entrada</span><span className="font-bold">{formatarMoeda(entradaNum)}</span></div><div className="flex justify-between text-sm"><span className="text-muted">Saldo em {parcelasNum - 1} parcelas</span><span className="font-bold">{formatarMoeda(simulacao.valorRestante)}</span></div></>}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Valor das parcelas {temEntrada ? "restantes" : ""}</span>
              <span className="font-bold">{formatarMoeda(simulacao.valorParcela)}</span>
            </div>
          </div>
        )}

        {erro && <p className="text-error text-sm font-medium">{erro}</p>}

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
    <button type="button" onClick={onClick} className={ativo ? "btn-primary min-w-0 !px-3 !py-3.5 leading-tight" : "btn-outline min-w-0 !px-3 !py-3.5 leading-tight"}>
      {children}
    </button>
  );
}
