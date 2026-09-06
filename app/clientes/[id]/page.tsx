// ============================================================================
// PÁGINA: Detalhe do cliente
// ----------------------------------------------------------------------------
// Mostra dados do cliente, score/situação, contato, endereço, observações
// internas e todos os contratos vinculados a ele, com o progresso de
// pagamento de cada um.
// ============================================================================
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { formatarMoeda, formatarData, iniciais, statusDoContrato } from "../../../lib/calculos";
import { exigirSessao } from "../../../lib/auth";
import Badge, { tomEScore, tomEStatusContrato, tomESituacaoCliente } from "../../../components/Badge";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { IconEdit, IconPhone, IconMail, IconMapPin } from "../../../components/Icons";

export const dynamic = "force-dynamic";

export default async function DetalheCliente({ params }: { params: { id: string } }) {
  const sessao = await exigirSessao();

  const cliente = await prisma.cliente.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { contratos: { include: { parcelas: true }, orderBy: { criadoEm: "desc" } } },
  });

  if (!cliente) notFound();

  const { tom, texto } = tomEScore(cliente.score);
  const situacaoInfo = tomESituacaoCliente(cliente.situacao);
  const totalEmprestado = cliente.contratos.reduce((s, c) => s + Number(c.valorEmprestado), 0);
  const totalAReceber = cliente.contratos
    .flatMap((c) => c.parcelas)
    .filter((p) => p.status !== "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  const enderecoCompleto = [
    cliente.logradouro && cliente.numero ? `${cliente.logradouro}, ${cliente.numero}` : cliente.logradouro,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade && cliente.uf ? `${cliente.cidade}/${cliente.uf}` : cliente.cidade,
    cliente.cep,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/clientes" />
        <h1 className="text-xl font-bold truncate flex-1">{cliente.nome}</h1>
        <Link href={`/clientes/${cliente.id}/editar`} className="icon-btn text-ink">
          <IconEdit size={17} />
        </Link>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="avatar !w-14 !h-14 !text-xl">{iniciais(cliente.nome)}</div>
            <div className="flex-1">
              <p className="font-bold text-lg">{cliente.nome}</p>
              {cliente.telefone && <p className="text-sm text-muted">{cliente.telefone}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge tom={tom}>{texto}</Badge>
              <Badge tom={situacaoInfo.tom}>{situacaoInfo.texto}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted font-semibold">TOTAL EMPRESTADO</p>
              <p className="font-bold mt-1">{formatarMoeda(totalEmprestado)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-xs text-muted font-semibold">A RECEBER</p>
              <p className="font-bold mt-1">{formatarMoeda(totalAReceber)}</p>
            </div>
          </div>
        </div>

        {/* --- Dados de contato ------------------------------------------------ */}
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
            <IconPhone size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">TELEFONE</p>
            <p className="font-medium">{cliente.telefone || "—"}</p>
            {cliente.telefone2 && <p className="text-sm text-muted">{cliente.telefone2} (secundário)</p>}
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
            <IconMail size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">E-MAIL</p>
            <p className="font-medium">{cliente.email || "—"}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
            <IconMapPin size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted">ENDEREÇO</p>
            <p className="font-medium">{enderecoCompleto || "—"}</p>
          </div>
        </div>

        {/* --- Documentos e outros dados cadastrais ----------------------------- */}
        {(cliente.cpf || cliente.rg || cliente.dataNascimento || cliente.referencia) && (
          <div className="card grid grid-cols-2 gap-3">
            {cliente.cpf && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted">CPF/CNPJ</p>
                <p className="font-medium text-sm mt-0.5">{cliente.cpf}</p>
              </div>
            )}
            {cliente.rg && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted">RG</p>
                <p className="font-medium text-sm mt-0.5">{cliente.rg}</p>
              </div>
            )}
            {cliente.dataNascimento && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted">NASCIMENTO</p>
                <p className="font-medium text-sm mt-0.5">{formatarData(cliente.dataNascimento)}</p>
              </div>
            )}
            {cliente.referencia && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted">INDICADO POR</p>
                <p className="font-medium text-sm mt-0.5">{cliente.referencia}</p>
              </div>
            )}
          </div>
        )}

        {cliente.observacoes && (
          <div className="card">
            <p className="text-xs font-semibold tracking-wide text-muted">OBSERVAÇÕES INTERNAS</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{cliente.observacoes}</p>
          </div>
        )}

        <Link href={`/contratos/novo?clienteId=${cliente.id}`} className="btn-primary">
          + Novo contrato para este cliente
        </Link>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">
            CONTRATOS ({cliente.contratos.length})
          </p>
          <div className="space-y-3">
            {cliente.contratos.length === 0 && (
              <div className="card text-center text-muted text-sm">Nenhum contrato ainda.</div>
            )}
            {cliente.contratos.map((c) => {
              const pagas = c.parcelas.filter((p) => p.status === "pago").length;
              const progresso = c.parcelas.length ? (pagas / c.parcelas.length) * 100 : 0;
              const statusInfo = tomEStatusContrato(statusDoContrato(c.parcelas));
              return (
                <Link key={c.id} href={`/contratos/${c.id}`} className="card block">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{c.codigo}</p>
                    <Badge tom={statusInfo.tom}>{statusInfo.texto}</Badge>
                  </div>
                  <p className="text-2xl font-extrabold text-primary mt-1">{formatarMoeda(c.valorTotal)}</p>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {pagas} de {c.parcelas.length} pagas · {c.numeroParcelas}x
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
