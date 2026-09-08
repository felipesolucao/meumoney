import Link from "next/link";
import { formatarMoeda } from "../lib/calculos";
import { tonCss } from "../lib/estiloCard";
import { IconDocument, IconTrendUp, IconTrendDown, IconChart } from "./Icons";

type Resumo = { total: number; recebido: number; pendente: number; lucro: number; atrasado: number; emDia: number; atrasados: number; quitados: number };

export default function ResumoContratos(resumo: Resumo) {
  const cards = [
    { label: "Valor total de contratos", valor: resumo.total, href: "/contratos", icon: IconDocument, tom: "foreground", fundo: "muted-surface" },
    { label: "Contratos recebidos", valor: resumo.recebido, href: "/parcelas?aba=recebidas", icon: IconTrendUp, tom: "success", fundo: "success-subtle" },
    { label: "Contratos pendentes", valor: resumo.pendente, href: "/parcelas?aba=pendentes", icon: IconTrendDown, tom: "warning", fundo: "warning-subtle" },
    { label: "Lucro projetado", valor: resumo.lucro, href: "/relatorios", icon: IconChart, tom: resumo.lucro >= 0 ? "success" : "error", fundo: resumo.lucro >= 0 ? "success-subtle" : "error-subtle" },
  ];
  const total = resumo.emDia + resumo.atrasados + resumo.quitados;
  return (
    <section className="loans-summary space-y-4" aria-label="Resumo dos contratos">
      <div className="loans-summary-cards grid grid-cols-2 gap-3">
        {cards.map(({ label, valor, href, icon: Icon, tom, fundo }) => (
          <Link key={label} href={href} className="card stat-card block min-w-0" style={tonCss(`var(--color-${tom})`, `var(--color-${fundo})`)}>
            <div className="stat-icon"><Icon size={18} /></div>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
            <p className="font-extrabold text-lg mt-1 break-words" style={{ color: `var(--color-${tom})` }}>{formatarMoeda(valor)}</p>
          </Link>
        ))}
      </div>
      <Link href="/parcelas?aba=atrasadas" className="loans-overdue card stat-card block" style={tonCss("var(--color-error)", "var(--color-error-subtle)")}>
        <p className="text-xs font-semibold tracking-wide text-muted mb-3">EM ATRASO</p>
        <p className="text-3xl font-extrabold text-error">{formatarMoeda(resumo.atrasado)}</p>
      </Link>
      <div className="loans-status card">
        <p className="text-xs font-semibold tracking-wide text-muted mb-3">CONTRATOS POR STATUS</p>
        {[
          { label: "Em dia", status: "em_dia", valor: resumo.emDia, cor: "success" },
          { label: "Atrasados", status: "atrasado", valor: resumo.atrasados, cor: "error" },
          { label: "Quitados", status: "quitado", valor: resumo.quitados, cor: "muted" },
        ].map(({ label, status, valor, cor }) => (
          <Link key={status} href={`/contratos?status=${status}`} className="block mb-3 last:mb-0">
            <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-semibold">{valor}</span></div>
            <div className="h-2 rounded-pill bg-muted-bg overflow-hidden"><div className="h-full rounded-pill" style={{ width: `${total ? valor / total * 100 : 0}%`, background: `var(--color-${cor})` }} /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
