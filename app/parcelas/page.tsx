// ============================================================================
// PÁGINA: Parcelas (todas as parcelas, com filtros de período)
// ----------------------------------------------------------------------------
// Desktop (>=1024px): mesma receita visual de Contratos/Clientes — cabeçalho
// mais alto com gradiente, cards com borda e badges menores (ver
// ".parcelas-shell" em app/globals.css). Como a lista aqui é agrupada por dia
// de vencimento (ver GrupoParcelas), o grid entra DENTRO de cada dia — não na
// lista toda — pra manter a ordem cronológica dos grupos. O cartão de
// filtro (seletor de mês / período por data) e o cartão de total ficam
// lado a lado no desktop (".parcelas-top-row"). Layout mobile intacto.
// ============================================================================
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { agruparPorDia, formatarMoeda, formatarData } from "../../lib/calculos";
import Badge, { tomEStatusParcela } from "../../components/Badge";
import { IconArrowLeft, IconChevronRight } from "../../components/Icons";
import MesSeletor from "../../components/MesSeletor";

type ParcelaComContrato = {
  id: string;
  numero: number;
  valor: string;
  valorPago: string | null;
  vencimento: string;
  status: string;
  contrato: { id: string; codigo: string; cliente: { nome: string; telefone: string | null } };
};

type Aba = "hoje" | "amanha" | "atrasadas" | "por_data" | "recebidas" | "pendentes";

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return isoLocal(d);
}

function inicioFimMes() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: isoLocal(inicio), fim: isoLocal(fim) };
}

export default function Parcelas() {
  return <Suspense fallback={<p className="p-5 text-muted">Carregando...</p>}><ListaParcelas /></Suspense>;
}

function ListaParcelas() {
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<Aba>("hoje");
  const [parcelas, setParcelas] = useState<ParcelaComContrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const { inicio, fim } = inicioFimMes();
  const [de, setDe] = useState(inicio);
  const [ate, setAte] = useState(fim);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth());
  const usaFiltroMes = aba === "pendentes" || aba === "recebidas";

  useEffect(() => {
    const destino = searchParams.get("aba");
    setAba(destino === "recebidas" || destino === "pendentes" || destino === "atrasadas" ? destino : "hoje");
  }, [searchParams]);

  useEffect(() => {
    setCarregando(true);
    setErro("");
    let url = "/api/parcelas?";
    if (aba === "hoje") url += `de=${isoHoje()}&ate=${isoHoje()}`;
    else if (aba === "amanha") url += `de=${isoHoje(1)}&ate=${isoHoje(1)}`;
    else if (aba === "atrasadas") url += `status=atrasado`;
    else if (aba === "recebidas") url += `status=pago`;
    else if (aba === "pendentes") url += `status=pendente`;
    else url += `de=${de}&ate=${ate}`;
    if (usaFiltroMes) {
      url += `&de=${isoLocal(new Date(ano, mes, 1))}&ate=${isoLocal(new Date(ano, mes + 1, 0))}`;
    }

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar parcelas");
        return r.json();
      })
      .then((data) => {
        setParcelas(data);
        setCarregando(false);
      }).catch(() => {
        if (!controller.signal.aborted) { setErro("Não foi possível carregar as parcelas. Atualize a página para tentar novamente."); setParcelas([]); setCarregando(false); }
      });
    return () => controller.abort();
  }, [aba, de, ate, ano, mes, usaFiltroMes]);

  const totalAReceber = useMemo(
    () => parcelas.filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0),
    [parcelas]
  );
  const pendentes = parcelas.filter((p) => p.status !== "pago");
  const grupos = useMemo(() => agruparPorDia(
    [...parcelas].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    (p) => p.vencimento
  ), [parcelas]);

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <Link href="/contratos" aria-label="Voltar para contratos" className="icon-btn text-foreground flex-shrink-0">
          <IconArrowLeft size={19} />
        </Link>
        <div>
        <h1 className="text-2xl font-bold">Parcelas</h1>
        <p className="text-muted text-sm">{parcelas.length} no total</p>
        </div>
      </div>

      <div className="parcelas-list px-5 mt-5 space-y-4">
        <div className="parcelas-filters flex flex-wrap gap-2">
          {(
            [
              { valor: "hoje", label: "Hoje" },
              { valor: "amanha", label: "Amanhã" },
              { valor: "atrasadas", label: "Atrasadas" },
              { valor: "por_data", label: "Por data" },
              { valor: "recebidas", label: "Recebidas" },
              { valor: "pendentes", label: "Pendentes" },
            ] as { valor: Aba; label: string }[]
          ).map((a) => (
            <button
              key={a.valor}
              onClick={() => setAba(a.valor)}
              aria-pressed={aba === a.valor}
              className={`px-4 py-2 rounded-pill text-sm font-semibold whitespace-nowrap ${
                aba === a.valor ? "bg-primary text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Cartão de filtro (mês/período) + total — empilhados no mobile,
            lado a lado no desktop (ver ".parcelas-top-row" no globals.css). */}
        <div className="parcelas-top-row space-y-4">
          {usaFiltroMes && (
            <div className="parcelas-config card">
              <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
            </div>
          )}
          {aba === "por_data" && (
            <div className="parcelas-config card grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <label className="min-w-0 text-xs font-semibold text-muted">De
                <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} className="mt-1 block w-full min-w-0 rounded-md border border-border p-2 text-sm text-foreground outline-none" />
              </label>
              <label className="min-w-0 text-xs font-semibold text-muted">Até
                <input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className="mt-1 block w-full min-w-0 rounded-md border border-border p-2 text-sm text-foreground outline-none" />
              </label>
            </div>
          )}

          <div className="parcelas-total card" style={{ background: "var(--color-primary-surface)" }}>
            <p className="text-xs font-semibold tracking-wide text-muted">{aba === "recebidas" ? "TOTAL RECEBIDO" : "TOTAL A RECEBER"}</p>
            <p className="text-3xl font-extrabold text-primary mt-1">{carregando ? "R$ —" : formatarMoeda(aba === "recebidas" ? parcelas.reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0) : totalAReceber)}</p>
            <p className="text-sm text-muted mt-0.5">{carregando ? "—" : aba === "recebidas" ? parcelas.length : pendentes.length} parcela(s)</p>
          </div>
        </div>

        {carregando && <p className="text-center text-muted text-sm">Carregando...</p>}
        {erro && <p role="alert" className="text-error text-sm">{erro}</p>}
        {!carregando && !erro && parcelas.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhuma parcela neste período.</div>
        )}

        <div className="parcelas-groups space-y-6">
          {!carregando && !erro && grupos.map((grupo) => (
            <GrupoParcelas key={grupo.itens[0].vencimento.slice(0, 10)} parcelas={grupo.itens} />
          ))}
        </div>
      </div>
    </div>
  );
}


function GrupoParcelas({ parcelas }: { parcelas: ParcelaComContrato[] }) {
  const data = parcelas[0].vencimento.slice(0, 10);
  const dia = new Date(`${data}T00:00:00Z`);
  const semana = dia.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  const mesNome = dia.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  const rotulo = `${semana}, ${data.slice(8, 10)} de ${mesNome}, ${data.slice(0, 4)}`;
  const totalDia = parcelas.reduce((s, p) => s + Math.round(Number(p.status === "pago" ? p.valorPago ?? p.valor : p.valor) * 100), 0) / 100;
  const dias = Math.round((dia.getTime() - new Date(`${isoHoje()}T00:00:00Z`).getTime()) / 86400000);
  const prazo = dias === 0 ? "Vence hoje" : dias === 1 ? "Falta 1 dia" : dias > 1 ? `Faltam ${dias} dias` : `Há ${Math.abs(dias)} ${dias === -1 ? "dia" : "dias"} em atraso`;
  return (
    <section key={data} aria-label={rotulo} className="parcelas-day space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
        <h2 className="min-w-0 text-sm font-semibold text-muted first-letter:uppercase">{rotulo}</h2>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total do dia</p>
          <p className="text-sm font-bold tabular-nums">{formatarMoeda(totalDia)}</p>
        </div>
      </div>
      {/* Grid só entra aqui dentro (por dia) — não na lista toda — pra manter
          os grupos em ordem cronológica no desktop (ver ".parcelas-day-grid"
          no globals.css). No mobile continua uma coluna só, sem alteração. */}
      <div className="parcelas-day-grid space-y-3">
        {parcelas.map((p) => {
          const efetivo = p.status === "pago" ? "pago" : dias < 0 ? "atrasado" : "a_vencer";
          const { tom, texto } = tomEStatusParcela(efetivo);
          return (
            <Link key={p.id} href={`/contratos/${p.contrato.id}`}
              className="card block border border-border transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                  style={{ background: p.status === "pago" ? "var(--color-success-subtle)" : "var(--color-warning-subtle)", color: p.status === "pago" ? "var(--color-success)" : "var(--color-warning)" }}>
                  {p.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-snug [overflow-wrap:anywhere]">{p.contrato.cliente.nome}</p>
                  <p className="text-xs text-muted mt-1">Parcela {p.numero} · Contrato {p.contrato.codigo}</p>
                </div>
                <IconChevronRight size={16} className="text-muted flex-shrink-0 mt-3" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                <p className="text-xl font-bold text-primary tabular-nums">{formatarMoeda(p.status === "pago" ? p.valorPago ?? p.valor : p.valor)}</p>
                <Badge tom={tom}>{texto}</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2 text-xs">
                <p className="text-muted">Vence {formatarData(p.vencimento)}</p>
                {p.status !== "pago" && <p className={`font-semibold ${dias < 0 ? "text-error" : "text-muted"}`}>{prazo}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
