// ============================================================================
// PÁGINA: Contratos (painel + lista com abas de status)
// ----------------------------------------------------------------------------
// Esta página absorveu o conteúdo que antes vivia em "/emprestimos" (resumo
// da carteira, parcelas de hoje, acesso rápido) — agora "/contratos" é a
// ÚNICA rota oficial para esse módulo. "/emprestimos" só redireciona pra cá
// (ver app/emprestimos/page.tsx).
//
// Além do resumo, esta tela ganhou:
//   - "Contratos no mês": mesmo seletor de mês usado na Início/Financeiro,
//     com opção de trocar para um período personalizado (ver dataDe/dataAte).
//   - Paginação na lista de contratos, pra não renderizar centenas de cards
//     de uma vez quando a carteira crescer.
// ============================================================================
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatarMoeda, statusDaParcela, statusDoContrato, formatarData } from "../../lib/calculos";
import { calcularIntervaloPeriodo, isoHoje } from "../../lib/periodo";
import Badge, { tomEStatusContrato } from "../../components/Badge";
import ResumoContratos from "../../components/ResumoContratos";
import ContratosNoMes from "../../components/ContratosNoMes";
import {
  IconHistory,
  IconReceipt,
  IconWallet,
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
  IconChart,
} from "../../components/Icons";

type Parcela = { status: string; vencimento: string; valor: string; valorPago: string | null };
type Contrato = {
  id: string;
  codigo: string;
  valorTotal: string;
  valorEmprestado: string;
  valorLucro: string;
  numeroParcelas: number;
  status: string;
  jurosAoMes: string;
  criadoEm: string;
  cliente: { nome: string };
  parcelas: Parcela[];
};

const ABAS = [
  { valor: "todos", label: "Todos" },
  { valor: "em_dia", label: "Em dia" },
  { valor: "atrasado", label: "Atrasados" },
  { valor: "quitado", label: "Quitados" },
];

const ITENS_POR_PAGINA = 12;

export default function Contratos() {
  return <Suspense fallback={<p className="p-5 text-muted">Carregando...</p>}><ListaContratos /></Suspense>;
}

function ListaContratos() {
  const searchParams = useSearchParams();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [aba, setAba] = useState("todos");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Seletor "Contratos no mês/período" — controla o resumo, as abas e a
  // lista logo abaixo (ver components/ContratosNoMes.tsx e lib/periodo.ts).
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState(false);
  const [dataDe, setDataDe] = useState(isoHoje(-30));
  const [dataAte, setDataAte] = useState(isoHoje());

  useEffect(() => {
    const status = searchParams.get("status");
    setAba(ABAS.find((a) => a.valor === status)?.valor ?? "todos");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/contratos")
      .then((r) => r.json())
      .then((data) => {
        setContratos(data);
        setCarregando(false);
      });
  }, []);

  // --- Contratos dentro do mês/período selecionado — base do resumo, das
  // abas (com contagem) e da lista abaixo. ---------------------------------
  const contratosNoPeriodo = useMemo(() => {
    const { inicio, fim } = calcularIntervaloPeriodo({ personalizado: periodoPersonalizado, ano, mes, dataDe, dataAte });
    return contratos.filter((c) => {
      const d = new Date(c.criadoEm);
      return d >= inicio && d <= fim;
    });
  }, [contratos, periodoPersonalizado, ano, mes, dataDe, dataAte]);

  // --- Resumo do período selecionado --------------------------------------
  const parcelasDoPeriodo = useMemo(() => contratosNoPeriodo.flatMap((c) => c.parcelas), [contratosNoPeriodo]);
  const totalContratos = useMemo(() => contratosNoPeriodo.reduce((soma, c) => soma + Number(c.valorTotal), 0), [contratosNoPeriodo]);
  const lucro = useMemo(() => contratosNoPeriodo.reduce((soma, c) => soma + Number(c.valorLucro), 0), [contratosNoPeriodo]);
  const atrasado = useMemo(
    () => parcelasDoPeriodo.filter((p) => statusDaParcela(new Date(p.vencimento), p.status === "pago") === "atrasado").reduce((s, p) => s + Number(p.valor), 0),
    [parcelasDoPeriodo]
  );
  const recebido = useMemo(
    () => parcelasDoPeriodo.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0),
    [parcelasDoPeriodo]
  );
  const aReceber = useMemo(
    () => parcelasDoPeriodo.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0),
    [parcelasDoPeriodo]
  );
  // Status efetivo de cada contrato do período — alimenta o resumo E a
  // contagem exibida em cada aba (Todos/Em dia/Atrasados/Quitados).
  const statusPorContratoPeriodo = useMemo(
    () => contratosNoPeriodo.map((c) => statusDoContrato(c.parcelas.map((p) => ({ vencimento: p.vencimento, status: p.status })))),
    [contratosNoPeriodo]
  );
  const contagemPorAba: Record<string, number> = {
    todos: contratosNoPeriodo.length,
    em_dia: statusPorContratoPeriodo.filter((s) => s === "em_dia").length,
    atrasado: statusPorContratoPeriodo.filter((s) => s === "atrasado").length,
    quitado: statusPorContratoPeriodo.filter((s) => s === "quitado").length,
  };

  // "Parcelas de hoje" independe do período selecionado (é sempre hoje).
  const hojeStr = hoje.toDateString();
  const parcelasHoje = useMemo(
    () => contratos.flatMap((c) => c.parcelas).filter((p) => p.status !== "pago" && new Date(p.vencimento).toDateString() === hojeStr),
    [contratos, hojeStr]
  );

  // --- Lista filtrada por período + aba/busca + paginação ------------------
  const filtrados = useMemo(() => {
    return contratosNoPeriodo.filter((c) => {
      const statusEfetivo = statusDoContrato(c.parcelas.map((p) => ({ vencimento: p.vencimento, status: p.status })));
      const passaAba = aba === "todos" || statusEfetivo === aba;
      const passaBusca = c.cliente.nome.toLowerCase().includes(busca.toLowerCase());
      return passaAba && passaBusca;
    });
  }, [contratosNoPeriodo, aba, busca]);

  useEffect(() => {
    setPagina(1);
  }, [aba, busca, periodoPersonalizado, ano, mes, dataDe, dataAte]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  return (
    <div>
      <div className="header-gradient flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-muted text-sm">{contratos.length} contrato(s)</p>
        </div>
        <Link href="/historico?entidade=Contrato&voltar=/contratos" className="icon-btn text-foreground">
          <IconHistory size={18} />
        </Link>
      </div>

      {/* Resumo geral + parcelas de hoje + acesso rápido — migrado de
          "/emprestimos" (ver comentário no topo do arquivo). */}
      <div className="loans-dashboard px-5 mt-5 space-y-5">
        <ResumoContratos
          total={totalContratos}
          recebido={recebido}
          pendente={aReceber}
          lucro={lucro}
          atrasado={atrasado}
          emDia={contagemPorAba.em_dia}
          atrasados={contagemPorAba.atrasado}
          quitados={contagemPorAba.quitado}
        />

        <div className="loans-today card flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-primary">
            <IconReceipt size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">PARCELAS DE HOJE</p>
            {parcelasHoje.length === 0 ? (
              <>
                <p className="font-bold">Não temos parcelas hoje</p>
                <p className="text-sm text-muted">Nenhum vencimento para hoje</p>
              </>
            ) : (
              <p className="font-bold">
                {parcelasHoje.length} parcela(s) — {formatarMoeda(parcelasHoje.reduce((s, p) => s + Number(p.valor), 0))}
              </p>
            )}
          </div>
        </div>

        <div className="loans-shortcuts">
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">ACESSO RÁPIDO</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            <AtalhoRapido href="/financeiro" icon={<IconWallet size={22} />} label="Financeiro" />
            <AtalhoRapido href="/clientes" icon={<IconUsers size={22} />} label="Clientes" />
            <AtalhoRapido href="/parcelas" icon={<IconReceipt size={22} />} label="Parcelas" />
            <AtalhoRapido href="/historico?entidade=Contrato&voltar=/contratos" icon={<IconChart size={22} />} label="Histórico" />
          </div>
        </div>
      </div>

      {/* Contratos no mês/período — controla o resumo acima e as abas/lista
          abaixo (ver components/ContratosNoMes.tsx). */}
      <ContratosNoMes
        ano={ano}
        mes={mes}
        onMudarMes={(a, m) => { setAno(a); setMes(m); }}
        periodoPersonalizado={periodoPersonalizado}
        onTogglePersonalizado={() => setPeriodoPersonalizado((v) => !v)}
        dataDe={dataDe}
        onMudarDataDe={setDataDe}
        dataAte={dataAte}
        onMudarDataAte={setDataAte}
        quantidade={contratosNoPeriodo.length}
      />

      <div className="contracts-list px-5 mt-5 space-y-4">
        <Link href="/contratos/novo" className="contracts-create btn-primary">
          + Novo contrato
        </Link>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome do cliente..."
          className="contracts-search w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
        />

        <div className="contracts-filters flex gap-2 overflow-x-auto pb-1">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              onClick={() => setAba(a.valor)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold whitespace-nowrap ${
                aba === a.valor ? "bg-primary text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              {a.label} ({contagemPorAba[a.valor]})
            </button>
          ))}
        </div>

        {carregando && <p className="text-center text-muted text-sm">Carregando...</p>}
        {!carregando && filtrados.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhum contrato encontrado.</div>
        )}

        <div className="contracts-grid space-y-3">
          {visiveis.map((c) => {
            const pagas = c.parcelas.filter((p) => p.status === "pago").length;
            const proxima = c.parcelas.find((p) => p.status !== "pago");
            const statusEfetivo = statusDoContrato(c.parcelas.map((p) => ({ vencimento: p.vencimento, status: p.status })));
            const statusInfo = tomEStatusContrato(statusEfetivo);
            return (
              <Link key={c.id} href={`/contratos/${c.id}`} className="card block">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{c.cliente.nome}</p>
                  <Badge tom={statusInfo.tom}>{statusInfo.texto}</Badge>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {c.codigo} · {Number(c.jurosAoMes)}% a.m.
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-2xl font-extrabold text-primary">{formatarMoeda(c.valorTotal)}</p>
                  <p className="text-sm text-muted">{c.numeroParcelas}x</p>
                </div>
                <div className="h-1.5 rounded-pill bg-muted-bg mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-pill"
                    style={{ width: `${c.parcelas.length ? (pagas / c.parcelas.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted">
                  <span>
                    {pagas} de {c.parcelas.length} pagas
                  </span>
                  {proxima && <span>Próx: {formatarData(proxima.vencimento)}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Paginação — só aparece quando há mais contratos do que cabem numa
            página, pra não renderizar centenas de cards de uma vez. */}
        {totalPaginas > 1 && (
          <div className="contracts-pagination flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              aria-label="Página anterior"
              className="icon-btn text-foreground disabled:opacity-40"
            >
              <IconChevronLeft size={18} />
            </button>
            <p className="text-sm text-muted">
              Página {paginaAtual} de {totalPaginas}
            </p>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              aria-label="Próxima página"
              className="icon-btn text-foreground disabled:opacity-40"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AtalhoRapido({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2">
      <div className="quick-tile text-primary">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
