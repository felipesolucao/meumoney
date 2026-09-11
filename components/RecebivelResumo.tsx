import { DetalheRecebivel, resumoRecebiveis, valoresRecebivel } from "../lib/recebiveis";
import { formatarMoeda, formatarData, statusEfetivoLancamento } from "../lib/financeiro";
import Badge, { tomEStatusLancamento } from "./Badge";

const frequencias: Record<string, string> = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };

export default function RecebivelResumo({ detalhe }: { detalhe: DetalheRecebivel }) {
  const { selecionado: item, ocorrencias, recorrencia } = detalhe;
  const resumo = resumoRecebiveis(ocorrencias);
  const valores = valoresRecebivel(item);
  const progresso = resumo.total > 0 ? Math.min(100, resumo.recebido / resumo.total * 100) : 0;
  const proxima = ocorrencias.find((parcela) => valoresRecebivel(parcela).restante > 0);
  const status = tomEStatusLancamento(statusEfetivoLancamento(item.status, item.dataVencimento));
  return <div className="contract-summary card space-y-4" style={{ background: "var(--color-primary-surface)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold tracking-wide text-muted">{recorrencia ? "TOTAL DAS OCORRÊNCIAS" : "VALOR DO RECEBÍVEL"}</p><Badge tom={item.status !== "pago" && valores.recebido > 0 ? "amber" : status.tom}>{item.status === "pago" ? "Recebido" : valores.recebido > 0 ? "Recebimento parcial" : status.texto}</Badge></div>
    <p className="text-3xl sm:text-4xl font-extrabold text-primary break-words">{formatarMoeda(resumo.total)}</p>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><p className="text-muted">Recebido</p><strong className="text-primary">{formatarMoeda(resumo.recebido)}</strong></div>
      <div><p className="text-muted">A receber</p><strong>{formatarMoeda(resumo.restante)}</strong></div>
      <div><p className="text-muted">Ocorrências</p><strong>{ocorrencias.length}</strong></div>
      <div><p className="text-muted">Frequência</p><strong>{recorrencia ? frequencias[recorrencia.periodicidade] || recorrencia.periodicidade : "Única"}</strong></div>
    </div>
    {recorrencia?.tipoFim === "sem_fim" && <p className="text-xs text-muted">Recorrência sem data final. Os totais representam as ocorrências já cadastradas.</p>}
    <div><div className="flex justify-between text-sm"><span>Progresso dos recebimentos</span><strong>{Math.round(progresso)}%</strong></div><div className="h-1.5 rounded-full bg-card mt-2 overflow-hidden" role="progressbar" aria-label="Progresso dos recebimentos" aria-valuenow={Math.round(progresso)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary" style={{ width: `${progresso}%` }} /></div></div>
    <div className="card space-y-1"><p className="text-xs font-semibold text-muted">TRANSAÇÃO SELECIONADA{item.numeroParcela ? ` · PARCELA ${item.numeroParcela}` : ""}</p><p className="font-bold">{formatarMoeda(valores.total)} · {formatarData(item.dataVencimento)}</p><p className="text-sm text-muted">Saldo desta transação: {formatarMoeda(valores.restante)}</p></div>
    {proxima && <p className="text-sm">Próximo recebimento em aberto: <strong>{formatarData(proxima.dataVencimento)}</strong> · {formatarMoeda(valoresRecebivel(proxima).restante)}</p>}
    <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted">Conta</p><p className="break-words">{item.conta?.nome || "Não informada"}</p></div><div><p className="text-muted">Categoria</p><p className="break-words">{item.categoria?.nome || "Sem categoria"}</p></div></div>
    {item.observacoes && <p className="text-sm whitespace-pre-wrap break-words">{item.observacoes}</p>}
  </div>;
}
