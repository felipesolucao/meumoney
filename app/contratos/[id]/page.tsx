// ============================================================================
// PÁGINA: Detalhe do contrato
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { formatarMoeda, formatarData, statusDoContrato } from "../../../lib/calculos";
import { exigirSessao } from "../../../lib/auth";
import Badge, { tomEStatusContrato } from "../../../components/Badge";
import ParcelasLista from "../../../components/ParcelasLista";
import ContratoAcoes from "../../../components/ContratoAcoes";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { IconHome } from "../../../components/Icons";

export const dynamic = "force-dynamic";

const LABEL_FREQ: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export default async function DetalheContrato({ params }: { params: { id: string } }) {
  const sessao = await exigirSessao();

  const contratoRaw = await prisma.contrato.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });

  if (!contratoRaw) notFound();

  // Serializa os campos Decimal/Date do Prisma para tipos simples antes de
  // repassar para os componentes de cliente.
  const contrato = JSON.parse(JSON.stringify(contratoRaw));

  const pagas = contrato.parcelas.filter((p: any) => p.status === "pago").length;
  const progresso = contrato.parcelas.length ? (pagas / contrato.parcelas.length) * 100 : 0;
  const recebido = contrato.parcelas
    .filter((p: any) => p.status === "pago")
    .reduce((s: number, p: any) => s + Number(p.valorPago ?? p.valor), 0);
  const proxima = contrato.parcelas.find((p: any) => p.status !== "pago");
  const statusInfo = tomEStatusContrato(statusDoContrato(contrato.parcelas));

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/contratos" />
        <Link href="/" className="icon-btn text-foreground">
          <IconHome size={19} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{contrato.cliente.nome}</h1>
          <p className="text-muted text-sm">{contrato.codigo}</p>
        </div>
      </div>

      <div className="contract-detail px-5 mt-5 space-y-5">
        <div className="contract-summary card" style={{ background: "var(--color-primary-surface)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted">VALOR DO CONTRATO</p>
            <Badge tom={statusInfo.tom}>{statusInfo.texto}</Badge>
          </div>
          <p className="text-4xl font-extrabold text-primary mt-1">{formatarMoeda(contrato.valorTotal)}</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <MiniCampo label="JUROS" valor={contrato.tipoEmprestimo === "fixo" ? "Fixo" : `${Number(contrato.jurosAoMes)}% a.m.`} />
            <MiniCampo label="PARCELAS" valor={`${contrato.numeroParcelas}x`} />
            <MiniCampo label="FREQUÊNCIA" valor={LABEL_FREQ[contrato.frequencia]} />
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted">Progresso</span>
            <span className="font-bold text-primary">{Math.round(progresso)}%</span>
          </div>
          <div className="h-1.5 rounded-pill bg-card mt-1 overflow-hidden">
            <div className="h-full bg-primary rounded-pill" style={{ width: `${progresso}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted">
            <span>
              {pagas} de {contrato.parcelas.length} pagas
            </span>
            <span>
              Recebido: <strong className="text-primary">{formatarMoeda(recebido)}</strong>
            </span>
          </div>

          {proxima && (
            <div className="card mt-4">
              <p className="text-xs font-semibold tracking-wide text-muted">PRÓXIMO VENCIMENTO</p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-bold">
                  Parcela {proxima.numero} · {formatarMoeda(proxima.valor)}
                </p>
                <p className="text-muted text-sm">{formatarData(proxima.vencimento)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-muted">
            <p>
              Lucro estimado: <strong style={{ color: "var(--color-primary)" }}>{formatarMoeda(contrato.valorLucro)}</strong>
            </p>
            <p>Início: {formatarData(contrato.dataPrimeiraParcela)}</p>
          </div>
        </div>

        <ContratoAcoes
          contratoId={contrato.id}
          clienteNome={contrato.cliente.nome}
          clienteTelefone={contrato.cliente.telefone}
          parcelas={contrato.parcelas}
          valorTotal={contrato.valorTotal}
          multaAtraso={contrato.multaAtraso}
          tipoMultaAtraso={contrato.tipoMultaAtraso}
          valorMultaAtraso={contrato.valorMultaAtraso}
        />

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">PARCELAS</p>
          <ParcelasLista
            parcelas={contrato.parcelas}
            clienteNome={contrato.cliente.nome}
            clienteTelefone={contrato.cliente.telefone}
            codigoContrato={contrato.codigo}
          />
        </div>
      </div>
    </div>
  );
}

function MiniCampo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md border border-card p-2.5 text-center" style={{ background: "var(--color-surface-inset)" }}>
      <p className="text-[10px] font-semibold tracking-wide text-muted">{label}</p>
      <p className="font-bold text-sm mt-0.5">{valor}</p>
    </div>
  );
}
