// ============================================================================
// PÁGINA: Editar contrato
// ----------------------------------------------------------------------------
// Reaproveita o mesmo tipo de formulário de /contratos/novo, só que pré-
// preenchido e enviando um PATCH em vez de um POST (ver
// app/api/contratos/[id]/route.ts).
//
// Se o contrato AINDA NÃO tem nenhuma parcela paga, tudo é editável — muda o
// contrato inteiro (valor, juros, entrada, parcelas, frequência, data) e as
// parcelas são recriadas do zero.
//
// Se já tem parcela paga, valor/juros/entrada ficam travados (mudar isso
// invalidaria o que já foi recebido) — só dá pra mudar a quantidade de
// parcelas, a frequência e a data, o que recria só as parcelas que ainda
// não foram pagas, mantendo as pagas intocadas.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarMoeda, Frequencia, TipoEmprestimo } from "../../../../lib/calculos";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "../../../../components/CampoMoeda";

type ContratoDetalhe = {
  id: string;
  codigo: string;
  cliente: { nome: string };
  valorEmprestado: string;
  tipoEmprestimo: TipoEmprestimo;
  jurosAoMes: string;
  valorEntrada: string;
  dataEntrada: string | null;
  numeroParcelas: number;
  frequencia: Frequencia;
  dataPrimeiraParcela: string;
  parcelas: { status: string }[];
};

export default function EditarContratoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [contrato, setContrato] = useState<ContratoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [valorEmprestado, setValorEmprestado] = useState("");
  const [tipoEmprestimo, setTipoEmprestimo] = useState<TipoEmprestimo>("juros");
  const [jurosAoMes, setJurosAoMes] = useState("0");
  const [temEntrada, setTemEntrada] = useState(false);
  const [valorEntrada, setValorEntrada] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState("");

  useEffect(() => {
    fetch(`/api/contratos/${params.id}`)
      .then((r) => r.json())
      .then((data: ContratoDetalhe) => {
        setContrato(data);
        setValorEmprestado(numeroParaValorFormatado(Number(data.valorEmprestado)));
        setTipoEmprestimo(data.tipoEmprestimo);
        setJurosAoMes(String(data.jurosAoMes));
        setTemEntrada(Number(data.valorEntrada) > 0);
        setValorEntrada(numeroParaValorFormatado(Number(data.valorEntrada)));
        setDataEntrada(data.dataEntrada ? data.dataEntrada.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setNumeroParcelas(String(data.numeroParcelas));
        setFrequencia(data.frequencia);
        setDataPrimeiraParcela(data.dataPrimeiraParcela.slice(0, 10));
        setCarregando(false);
      });
  }, [params.id]);

  const pagas = contrato?.parcelas.filter((p) => p.status === "pago").length ?? 0;
  const travado = pagas > 0;
  const parcelasNum = parseInt(numeroParcelas) || 1;

  async function salvar() {
    if (!numeroParcelas || !frequencia || !dataPrimeiraParcela) return setErro("Preencha todos os campos obrigatórios.");
    if (travado && parcelasNum < pagas) return setErro(`Já tem ${pagas} parcela(s) paga(s) — não dá pra ter menos parcelas que isso.`);

    const valorNum = valorFormatadoParaNumero(valorEmprestado);
    const entradaNum = temEntrada ? valorFormatadoParaNumero(valorEntrada) : 0;
    if (!travado && !valorNum) return setErro("Informe o valor do contrato.");
    if (!travado && temEntrada && (!entradaNum || entradaNum >= valorNum)) return setErro("Informe uma entrada menor que o valor do contrato.");

    setErro("");
    setSalvando(true);
    const res = await fetch(`/api/contratos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(travado
          ? {}
          : {
              valorEmprestado: valorNum,
              tipoEmprestimo,
              jurosAoMes: parseFloat(jurosAoMes.replace(",", ".")) || 0,
              valorEntrada: entradaNum,
              dataEntrada: temEntrada ? dataEntrada : undefined,
            }),
        numeroParcelas: parcelasNum,
        frequencia,
        dataPrimeiraParcela,
      }),
    });
    setSalvando(false);
    if (res.ok) {
      router.push(`/contratos/${params.id}`);
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar as alterações.");
    }
  }

  if (carregando || !contrato) {
    return (
      <div>
        <div className="header-gradient"><h1 className="text-2xl font-bold">Editar contrato</h1></div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={`/contratos/${params.id}`} />
        <div>
          <h1 className="text-2xl font-bold">Editar {contrato.codigo}</h1>
          <p className="text-muted text-sm">{contrato.cliente.nome}</p>
        </div>
      </div>

      <div className="contract-form px-5 mt-6 space-y-5 overflow-x-hidden">
        {travado && (
          <div className="card !py-3" style={{ background: "var(--color-warning-subtle)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>
              {pagas} parcela(s) já paga(s)
            </p>
            <p className="text-xs text-muted mt-0.5">
              Valor, juros e entrada ficam travados pra não invalidar o que já foi recebido. Dá pra mudar a quantidade
              de parcelas, a frequência e a data — só as parcelas ainda não pagas são recalculadas.
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR DO CONTRATO</p>
          {travado ? (
            <p className="form-input w-full bg-muted-bg text-muted">{formatarMoeda(contrato.valorEmprestado)}</p>
          ) : (
            <CampoMoeda value={valorEmprestado} onChange={setValorEmprestado} />
          )}
        </div>

        {!travado && (
          <>
            <label className="card flex min-w-0 items-center justify-between gap-3 cursor-pointer">
              <span className="min-w-0"><span className="font-semibold block">Possui entrada</span><span className="text-xs text-muted block truncate">Será a 1ª parcela do contrato</span></span>
              <input type="checkbox" checked={temEntrada} onChange={(e) => setTemEntrada(e.target.checked)} className="w-6 h-6 accent-primary" />
            </label>

            {temEntrada && (
              <div className="card space-y-4" style={{ background: "var(--color-primary-surface)" }}>
                <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">VALOR DA ENTRADA</p><CampoMoeda value={valorEntrada} onChange={setValorEntrada} /></div>
                <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DA ENTRADA</p><input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="form-input form-date-input" /></div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">TIPO DE CONTRATO</p>
              <div className="grid grid-cols-2 gap-2">
                <BotaoToggle ativo={tipoEmprestimo === "fixo"} onClick={() => setTipoEmprestimo("fixo")}>Valor Fixo</BotaoToggle>
                <BotaoToggle ativo={tipoEmprestimo === "juros"} onClick={() => setTipoEmprestimo("juros")}>Com Juros</BotaoToggle>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">JUROS % A.M.</p>
              <input
                value={jurosAoMes}
                onChange={(e) => setJurosAoMes(e.target.value)}
                disabled={tipoEmprestimo === "fixo"}
                inputMode="decimal"
                className="form-input disabled:bg-muted-bg"
              />
            </div>
          </>
        )}

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">TOTAL DE PARCELAS</p>
          <input value={numeroParcelas} onChange={(e) => setNumeroParcelas(e.target.value)} inputMode="numeric" className="form-input" />
        </div>

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
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">
            {travado ? "DATA DA PRÓXIMA PARCELA (recalcula as pendentes)" : "DATA DA PRIMEIRA PARCELA"}
          </p>
          <input type="date" value={dataPrimeiraParcela} onChange={(e) => setDataPrimeiraParcela(e.target.value)} className="form-input form-date-input" />
        </div>

        {erro && <p className="text-error text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

function BotaoToggle({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={ativo ? "btn-primary min-w-0 !px-3 !py-3.5 leading-tight" : "btn-outline min-w-0 !px-3 !py-3.5 leading-tight"}>
      {children}
    </button>
  );
}
