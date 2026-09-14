// ============================================================================
// COMPONENTE: Card de uma transação (lista "Ver todas transações")
// ----------------------------------------------------------------------------
// Ícone colorido (verde entrando / vermelho saindo), nome em até 2 linhas,
// conta e categoria embaixo do nome, e à direita o valor + um check indicando
// se já foi paga/recebida (uma compra no cartão ainda não fechada nunca
// aparece com o check marcado — ver comentário em /api/financeiro/transacoes).
//
// NOVO: o card inteiro é um link pra origem/detalhe da transação — cada
// "origemTipo" tem sua própria tela já existente no app, então não duplica
// nada aqui, só decide pra onde apontar:
//   lancamento    -> /financeiro/[id]/editar   (edição completa do lançamento)
//   compra_cartao -> /financeiro/cartoes/compra/[id] (extrato da compra)
//   parcela       -> /contratos/[contratoId]   (parcela não tem tela própria
//                     — o "detalhe" dela é o contrato inteiro, com todas as
//                     parcelas e o cliente)
// ============================================================================
import Link from "next/link";
import { formatarMoeda } from "../lib/financeiro";
import { IconTrendUp, IconTrendDown, IconCheck, IconChevronRight } from "./Icons";

export type TransacaoItem = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  entrada: boolean;
  pago: boolean;
  contaNome: string | null;
  contaIcone: string | null;
  categoriaNome: string | null;
  categoriaIcone: string | null;
  origemTipo: "lancamento" | "compra_cartao" | "parcela";
  origemId: string;
  contratoId: string | null;
};

function hrefOrigem(t: TransacaoItem): string {
  if (t.origemTipo === "compra_cartao") return `/financeiro/cartoes/compra/${t.origemId}`;
  if (t.origemTipo === "parcela") return `/contratos/${t.contratoId}`;
  return `/financeiro/${t.origemId}/editar`;
}

export default function TransacaoCard({ transacao }: { transacao: TransacaoItem }) {
  const t = transacao;
  const subtitulo = [
    t.categoriaIcone && t.categoriaNome ? `${t.categoriaIcone} ${t.categoriaNome}` : t.categoriaNome,
    t.contaIcone && t.contaNome ? `${t.contaIcone} ${t.contaNome}` : t.contaNome,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={hrefOrigem(t)} className="card flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: t.entrada ? "var(--color-success-subtle)" : "var(--color-error-subtle)",
          color: t.entrada ? "var(--color-success)" : "var(--color-error)",
        }}
      >
        {t.entrada ? <IconTrendUp size={18} /> : <IconTrendDown size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold leading-snug line-clamp-2">{t.descricao}</p>
        {subtitulo && <p className="text-xs text-muted mt-0.5 truncate">{subtitulo}</p>}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="font-bold" style={{ color: t.entrada ? "var(--color-success)" : "var(--color-error)" }}>
          {t.entrada ? "+" : "−"} {formatarMoeda(t.valor)}
        </p>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: t.pago ? "var(--color-success-subtle)" : "var(--color-muted-surface)",
            color: t.pago ? "var(--color-success)" : "var(--color-muted)",
          }}
          aria-label={t.pago ? "Pago" : "Não pago"}
          title={t.pago ? (t.entrada ? "Recebido" : "Pago") : t.entrada ? "A receber" : "Não pago"}
        >
          <IconCheck size={12} strokeWidth={3} />
        </span>
      </div>

      <IconChevronRight size={16} className="text-muted shrink-0" />
    </Link>
  );
}
