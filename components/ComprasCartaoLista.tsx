// ============================================================================
// COMPONENTE: Lista de compras no cartão (dentro do detalhe de uma categoria)
// ----------------------------------------------------------------------------
// Extraído de app/financeiro/categorias/[id]/page.tsx — uma compra no cartão
// (CompraCartao) não passa pelas ações de LancamentosLista (pagar/estornar
// não fazem sentido pra ela: seu "pagamento" é a fatura inteira fechando,
// ver lib/cartao.ts), então cada item aqui é só um link pro extrato da
// compra, onde dá pra editar/excluir de verdade.
// ============================================================================
import Link from "next/link";
import { formatarMoeda, formatarData } from "../lib/financeiro";
import { IconCreditCard } from "./Icons";

export type CompraCartaoItem = {
  id: string;
  descricao: string;
  valor: string;
  dataCompra: string;
  cartao: { nome: string; icone: string };
};

export default function ComprasCartaoLista({ compras }: { compras: CompraCartaoItem[] }) {
  if (compras.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-muted">COMPRAS NO CARTÃO</p>
      {compras.map((c) => (
        <Link key={c.id} href={`/financeiro/cartoes/compra/${c.id}`} className="card flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center text-xl flex-shrink-0">
            <span className="text-error">
              <IconCreditCard size={20} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{c.descricao}</p>
            <p className="text-sm text-muted">
              {[`${c.cartao.icone} ${c.cartao.nome}`, formatarData(c.dataCompra)].join(" · ")}
            </p>
          </div>
          <p className="font-bold text-error flex-shrink-0">- {formatarMoeda(c.valor)}</p>
        </Link>
      ))}
    </div>
  );
}
