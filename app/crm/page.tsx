// ============================================================================
// PÁGINA: /crm — quadro kanban de leads (produto separado do financeiro)
// ----------------------------------------------------------------------------
// Server component: só autentica e busca os leads do usuário direto pelo
// Prisma (mais rápido que ir até a própria API interna). Toda a interação
// (arrastar, filtrar, cadastrar, importar) acontece no client component
// <CrmBoard>, que recebe esses dados já serializados como estado inicial.
// ============================================================================
import { exigirSessao } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import CrmBoard from "../../components/crm/CrmBoard";
import type { LeadCrmResumo } from "../../lib/crm";

export default async function CrmPage() {
  const sessao = await exigirSessao();

  const leads = await prisma.leadCrm.findMany({
    where: { usuarioId: sessao.id },
    orderBy: [{ estagio: "asc" }, { ordem: "asc" }],
  });

  // Decimal e Date do Prisma não são serializáveis diretamente ao passar de
  // server component pra client component — viram string aqui.
  const leadsIniciais: LeadCrmResumo[] = leads.map((l) => ({
    id: l.id,
    nome: l.nome,
    estagio: l.estagio,
    ordem: l.ordem,
    valorEmAberto: l.valorEmAberto ? l.valorEmAberto.toString() : null,
    quantidadeParcelas: l.quantidadeParcelas,
    quantidadeColaboradores: l.quantidadeColaboradores,
    cnpj: l.cnpj,
    telefone: l.telefone,
    telefone2: l.telefone2,
    email: l.email,
    sindicatoPatronal: l.sindicatoPatronal,
    origem: l.origem,
    observacoes: l.observacoes,
    camposExtras: (l.camposExtras as Record<string, unknown> | null) ?? null,
    movimentadoEm: l.movimentadoEm.toISOString(),
    criadoEm: l.criadoEm.toISOString(),
    atualizadoEm: l.atualizadoEm.toISOString(),
  }));

  return <CrmBoard leadsIniciais={leadsIniciais} nomeUsuario={sessao.nome} />;
}
