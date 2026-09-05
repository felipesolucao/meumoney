// ============================================================================
// PÁGINA: Relatórios
// ============================================================================
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/calculos";

export const dynamic = "force-dynamic";

export default async function Relatorios() {
  const contratos = await prisma.contrato.findMany({ include: { parcelas: true } });
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
          <Cartao label="TOTAL EMPRESTADO" valor={formatarMoeda(totalEmprestado)} />
          <Cartao label="LUCRO PROJETADO" valor={formatarMoeda(lucroTotal)} destaque />
          <Cartao label="RECEBIDO" valor={formatarMoeda(recebido)} />
          <Cartao label="A RECEBER" valor={formatarMoeda(aReceber)} />
        </div>

        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">EM ATRASO</p>
          <p className="text-3xl font-extrabold" style={{ color: "#E4544A" }}>
            {formatarMoeda(atrasado)}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">CONTRATOS POR STATUS</p>
          <LinhaBarra label="Em dia" valor={emDia} total={contratos.length} cor="#2FA85A" />
          <LinhaBarra label="Atrasados" valor={atrasados} total={contratos.length} cor="#E4544A" />
          <LinhaBarra label="Quitados" valor={quitados} total={contratos.length} cor="#6B7280" />
        </div>
      </div>
    </div>
  );
}

function Cartao({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="card">
      <p className="text-[11px] font-semibold tracking-wide text-muted">{label}</p>
      <p className={`font-extrabold mt-1 ${destaque ? "text-primary text-xl" : "text-lg"}`}>{valor}</p>
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
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}
