// ============================================================================
// PÁGINA: Financeiro (painel de controle financeiro pessoal e empresarial)
// ----------------------------------------------------------------------------
// Mostra o balanço do mês selecionado (receitas x despesas), quanto está
// pendente para pagar e para receber, e atalhos para o histórico e o
// cadastro de novos lançamentos. Independente do módulo de Contratos.
//
// Virou client component (antes era server component) para permitir navegar
// entre meses sem recarregar a página — o resumo vem de /api/financeiro/resumo.
// "Novo lançamento" sempre abre com a data pré-preenchida dentro do mês que
// está sendo visualizado no momento (passada como query string), então dá
// pra lançar algo em meses passados ou futuros sem precisar trocar a data
// manualmente depois.
// ============================================================================
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatarMoeda } from "../../lib/financeiro";
import CardSaldo from "../../components/CardSaldo";
import MesSeletor from "../../components/MesSeletor";
import { IconPlus, IconReceipt, IconWallet, IconAlert, IconHistory, IconCalendar } from "../../components/Icons";

type Resumo = {
  receitasDoMes: number;
  despesasDoMes: number;
  balanco: number;
  totalAPagar: number;
  totalAReceber: number;
  contasAPagar: number;
  contasAReceber: number;
  atrasadas: number;
};

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

export default function Financeiro() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  // Período personalizado (selecionado no calendário) — quando ativo,
  // substitui a navegação por mês e passa a filtrar por um intervalo
  // exato de datas, útil para analisar uma quinzena, um trimestre etc.
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState(false);
  const [dataDe, setDataDe] = useState(isoHoje(-30));
  const [dataAte, setDataAte] = useState(isoHoje());

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const url = periodoPersonalizado
      ? `/api/financeiro/resumo?de=${dataDe}&ate=${dataAte}`
      : `/api/financeiro/resumo?ano=${ano}&mes=${mes}`;

    fetch(url)
      .then((r) => r.json())
      .then((data: Resumo) => {
        setResumo(data);
        setCarregando(false);
      });
  }, [ano, mes, periodoPersonalizado, dataDe, dataAte]);

  // Data usada para pré-preencher "Novo lançamento": dia 1 do mês em
  // visualização, exceto quando o mês em questão é o atual — nesse caso usa
  // hoje mesmo, que é o padrão mais útil.
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();
  const dataSugerida = ehMesAtual
    ? hoje.toISOString().slice(0, 10)
    : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  return (
    <div>
      <div className="header-gradient">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted text-sm">Controle financeiro</p>
            <h1 className="text-xl font-bold truncate">Seu resumo do mês</h1>
          </div>
          {/* Botão de novo lançamento — tamanho fixo 40x40 (mesmo padrão dos
              outros ícones de topo do app, ver .icon-btn no globals.css) */}
          <Link
            href={`/financeiro/novo?data=${dataSugerida}`}
            aria-label="Novo lançamento"
            className="icon-btn text-primary flex-shrink-0"
          >
            <IconPlus size={18} />
          </Link>
        </div>

        {/* Navegação de mês ou período personalizado — agora vive aqui, na
            própria tela do Financeiro (antes só existia em /historico) */}
        <div className="card mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted">
              {periodoPersonalizado ? "PERÍODO PERSONALIZADO" : "MÊS"}
            </p>
            <button
              type="button"
              onClick={() => setPeriodoPersonalizado((v) => !v)}
              className="text-xs font-semibold text-primary flex items-center gap-1"
            >
              <IconCalendar size={13} />
              {periodoPersonalizado ? "Ver por mês" : "Período personalizado"}
            </button>
          </div>

          {periodoPersonalizado ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <span className="text-muted text-sm">até</span>
              <input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          ) : (
            <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
          )}
        </div>

        {/* Balanço do mês ou período selecionado */}
        <div className="mt-4">
          <CardSaldo
            label={periodoPersonalizado ? "BALANÇO DO PERÍODO" : "BALANÇO DO MÊS"}
            valor={carregando ? "R$ —" : formatarMoeda(resumo?.balanco ?? 0)}
            corValor={(resumo?.balanco ?? 0) >= 0 ? "var(--color-success)" : "var(--color-error)"}
          >
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-md border p-3 bg-white/60" style={{ borderColor: "var(--color-primary-border)" }}>
                <p className="text-primary text-xs font-semibold">RECEITAS</p>
                <p className="font-bold mt-1">{carregando ? "—" : formatarMoeda(resumo?.receitasDoMes ?? 0)}</p>
              </div>
              <div className="rounded-md border p-3 bg-white/60" style={{ borderColor: "var(--color-border-error)" }}>
                <p className="text-error text-xs font-semibold">DESPESAS</p>
                <p className="font-bold mt-1">{carregando ? "—" : formatarMoeda(resumo?.despesasDoMes ?? 0)}</p>
              </div>
            </div>
          </CardSaldo>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Botão de novo lançamento em destaque (largura total, ação principal) */}
        <Link href={`/financeiro/novo?data=${dataSugerida}`} className="btn-primary flex items-center justify-center gap-2">
          <IconPlus size={18} /> Novo lançamento
        </Link>

        <Link
          href="/historico?entidade=Lancamento&voltar=/financeiro"
          className="text-sm font-semibold text-primary flex items-center gap-1.5 justify-end"
        >
          <IconHistory size={15} /> Ver histórico de ações
        </Link>

        {/* Pendências e alertas — sempre olhando o total geral, não só o mês
            em visualização, já que uma conta atrasada de outro mês continua
            relevante independente de qual mês está sendo navegado agora. */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">PENDÊNCIAS E ALERTAS (GERAL)</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/financeiro/pagar" className="card block">
              <p className="text-xs font-semibold text-error">A PAGAR</p>
              <p className="font-bold mt-1">{carregando ? "—" : formatarMoeda(resumo?.totalAPagar ?? 0)}</p>
              <p className="text-xs text-muted mt-1">{resumo?.contasAPagar ?? 0} conta(s)</p>
            </Link>
            <Link href="/financeiro/receber" className="card block">
              <p className="text-xs font-semibold text-primary">A RECEBER</p>
              <p className="font-bold mt-1">{carregando ? "—" : formatarMoeda(resumo?.totalAReceber ?? 0)}</p>
              <p className="text-xs text-muted mt-1">{resumo?.contasAReceber ?? 0} conta(s)</p>
            </Link>
          </div>
          {(resumo?.atrasadas ?? 0) > 0 && (
            <div className="card mt-3 flex items-center gap-2" style={{ background: "var(--color-error-subtle)" }}>
              <IconAlert size={18} className="text-error" />
              <p className="text-sm font-semibold text-error">{resumo?.atrasadas} lançamento(s) em atraso</p>
            </div>
          )}
        </div>

        {/* Acesso rápido */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">ACESSO RÁPIDO</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <AtalhoRapido href="/financeiro/pagar" icon={<IconReceipt size={22} />} label="A pagar" />
            <AtalhoRapido href="/financeiro/receber" icon={<IconWallet size={22} />} label="A receber" />
            <AtalhoRapido href={`/financeiro/novo?data=${dataSugerida}`} icon={<IconPlus size={22} />} label="Novo" />
          </div>
        </div>
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
