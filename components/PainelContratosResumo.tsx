// ============================================================================
// COMPONENTE: Painel do topo da tela Contratos
// ----------------------------------------------------------------------------
// Agrupa o que foi migrado de "/emprestimos": o resumo geral (ResumoContratos),
// o card de parcelas que vencem hoje e o acesso rápido. Extraído da página
// só pra manter app/contratos/page.tsx dentro do limite de linhas do lint —
// sem lógica própria, é puro recebe-e-desenha.
// ============================================================================
import Link from "next/link";
import { formatarMoeda } from "../lib/calculos";
import ResumoContratos from "./ResumoContratos";
import { IconReceipt, IconWallet, IconUsers, IconChart } from "./Icons";

type Parcela = { status: string; vencimento: string; valor: string; valorPago: string | null };

export default function PainelContratosResumo({
  total,
  recebido,
  pendente,
  lucro,
  atrasado,
  emDia,
  atrasados,
  quitados,
  parcelasHoje,
}: {
  total: number;
  recebido: number;
  pendente: number;
  lucro: number;
  atrasado: number;
  emDia: number;
  atrasados: number;
  quitados: number;
  parcelasHoje: Parcela[];
}) {
  return (
    <div className="loans-dashboard px-5 mt-5 space-y-5">
      <ResumoContratos
        total={total}
        recebido={recebido}
        pendente={pendente}
        lucro={lucro}
        atrasado={atrasado}
        emDia={emDia}
        atrasados={atrasados}
        quitados={quitados}
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
