// ============================================================================
// PÁGINA: Relatórios
// ============================================================================
import { prisma } from "../../lib/prisma";
import { formatarMoeda } from "../../lib/calculos";
import { exigirSessao } from "../../lib/auth";
import { tonCss } from "../../lib/estiloCard";
import { IconWallet, IconTrendUp, IconTrendDown, IconChart } from "../../components/Icons";

export const dynamic = "force-dynamic";

export default async function Relatorios() {
  const sessao = await exigirSessao();

  const contratos = await prisma.contrato.findMany({ where: { usuarioId: sessao.id }, include: { parcelas: true } });
  const todasParcelas = contratos.flatMap((c) => c.parcelas);

  const totalEmprestado = contratos.reduce((s, c) => s + Number(c.valorEmprestado), 0);
  const lucroTotal = contratos.reduce((s, c) => s + Number(c.valorLucro), 0);
  const recebido = todasParcelas
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valorPago ?? p.valor), 0);
  const aReceber = todasParcelas
    .filter((p) => p.status !== "pago")
    .reduce((s, p) => s + Number(p.valor), 0);
  const atrasado = todasParcelas
    .filter((p) => p.status === "atrasado")
    .reduce((s, p) => s + Number(p.valor), 0);

  const emDia = contratos.filter((c) => c.status === "em_dia").length;
  const atrasados = contratos.filter((c) => c.status === "atrasado").length;
  const quitados = contratos.filter((c) => c.status === "quitado").length;

  return (
    <div>
      <div className="header-gradient">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted text-sm">Visão geral da carteira</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Cartao label="EMPRESTADO" valor={formatarMoeda(totalEmprestado)} icone={<IconWallet size={18} />} tom="var(--color-foreground)" tomSubtle="var(--color-muted-surface)" />
          <Cartao label="RECEBIDO" valor={formatarMoeda(recebido)} icone={<IconTrendUp size={18} />} tom="var(--color-success)" />
          <Cartao label="PENDENTE" valor={formatarMoeda(aReceber)} icone={<IconTrendDown size={18} />} tom="var(--color-warning)" />
          <Cartao
            label="LUCRO PROJETADO"
            valor={formatarMoeda(lucroTotal)}
            icone={<IconChart size={18} />}
            tom={lucroTotal >= 0 ? "var(--color-success)" : "var(--color-error)"}
            destaque
          />
        </div>

        <div className="card stat-card" style={tonCss("var(--color-error)", "var(--color-error-subtle)")}>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">EM ATRASO</p>
          <p className="text-3xl font-extrabold" style={{ color: "var(--color-error)" }}>
            {formatarMoeda(atrasado)}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">CONTRATOS POR STATUS</p>
          <LinhaBarra label="Em dia" valor={emDia} total={contratos.length} cor="var(--color-success)" />
          <LinhaBarra label="Atrasados" valor={atrasados} total={contratos.length} cor="var(--color-error)" />
          <LinhaBarra label="Quitados" valor={quitados} total={contratos.length} cor="var(--color-muted)" />
        </div>
      </div>
    </div>
  );
}

function Cartao({
  label,
  valor,
  icone,
  tom,
  tomSubtle,
  destaque,
}: {
  label: string;
  valor: string;
  icone: React.ReactNode;
  tom: string;
  tomSubtle?: string;
  destaque?: boolean;
}) {
  return (
    <div className="card stat-card" style={tonCss(tom, tomSubtle)}>
      <div className="stat-icon">{icone}</div>
      <p className="text-[11px] font-semibold tracking-wide text-muted">{label}</p>
      <p className={`font-extrabold mt-1 ${destaque ? "text-xl" : "text-lg"}`} style={{ color: destaque ? tom : undefined }}>
        {valor}
      </p>
    </div>
  );
}

function LinhaBarra({ label, valor, total, cor }: { label: string; valor: number; total: number; cor: string }) {
  const pct = total ? (valor / total) * 100 : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="h-2 rounded-pill bg-muted-bg overflow-hidden">
        <div className="h-full rounded-pill" style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}
