// ============================================================================
// CRM — constantes e helpers compartilhados (produto separado, ver app/crm)
// ----------------------------------------------------------------------------
// Fonte única de verdade para as colunas do Kanban: ordem, rótulo e cor de
// cada estágio. Usado tanto no servidor (rotas de API, validação) quanto no
// cliente (quadro, formulários, importação) — nunca duplique esta lista.
// ============================================================================
import { EstagioLeadCrm } from "@prisma/client";

export type EstagioInfo = {
  id: EstagioLeadCrm;
  label: string;
  /** cor sólida — barra da coluna, ponto do card, bordas em destaque */
  cor: string;
  /** fundo suave (badges, cabeçalho da coluna) derivado da cor sólida */
  corSuave: string;
};

// Ordem = ordem das colunas no quadro, da esquerda pra direita.
export const ESTAGIOS: EstagioInfo[] = [
  { id: "primeira_tentativa", label: "1ª tentativa", cor: "#3B82F6", corSuave: "rgba(59,130,246,0.16)" },
  { id: "segunda_tentativa", label: "2ª tentativa", cor: "#6366F1", corSuave: "rgba(99,102,241,0.16)" },
  { id: "email_cobranca", label: "E-mail de cobrança", cor: "#06B6D4", corSuave: "rgba(6,182,212,0.16)" },
  { id: "em_negociacao", label: "Em negociação", cor: "#A855F7", corSuave: "rgba(168,85,247,0.16)" },
  { id: "sem_resposta", label: "Sem resposta", cor: "#F59E0B", corSuave: "rgba(245,158,11,0.16)" },
  { id: "sem_contato", label: "Sem contato", cor: "#64748B", corSuave: "rgba(100,116,139,0.18)" },
  { id: "a_cancelar", label: "À cancelar", cor: "#FB7185", corSuave: "rgba(251,113,133,0.16)" },
  { id: "cancelado", label: "Cancelado", cor: "#EF4444", corSuave: "rgba(239,68,68,0.16)" },
  { id: "negociacao_ok", label: "Negociação OK", cor: "#14B8A6", corSuave: "rgba(20,184,166,0.16)" },
  { id: "negociado", label: "Negociado", cor: "#22C55E", corSuave: "rgba(34,197,94,0.16)" },
  { id: "aguardando_pagamento", label: "Aguardando pagamento", cor: "#EAB308", corSuave: "rgba(234,179,8,0.16)" },
];

export const ESTAGIOS_IDS = ESTAGIOS.map((e) => e.id);

export const ESTAGIOS_MAP: Record<string, EstagioInfo> = Object.fromEntries(ESTAGIOS.map((e) => [e.id, e]));

export function infoEstagio(id: string): EstagioInfo {
  return ESTAGIOS_MAP[id] ?? ESTAGIOS[0];
}

// Estágios que encerram o funil — não contam mais como "backlog ativo".
// (tipado como string[] para comparar direto com o "estagio" já serializado
// que chega no client component, sem precisar de cast em cada uso)
export const ESTAGIOS_ENCERRADOS: string[] = ["cancelado", "negociado"];

// A partir de quantos dias sem trocar de estágio um lead é considerado
// "parado" (ver indicador "Sem movimento" no topo do quadro).
export const DIAS_SEM_MOVIMENTO = 7;

export function diasParado(movimentadoEm: Date | string): number {
  const data = typeof movimentadoEm === "string" ? new Date(movimentadoEm) : movimentadoEm;
  const ms = Date.now() - data.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatarMoedaCrm(valor: number | string | { toString(): string } | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  const n = typeof valor === "number" ? valor : parseFloat(valor.toString());
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Formato compacto para KPIs (ex: R$ 1,2 mi) — números grandes de carteira
// não cabem por extenso nos cartões do topo.
export function formatarMoedaCompacta(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export type LeadCrmResumo = {
  id: string;
  nome: string;
  estagio: string;
  ordem: number;
  valorEmAberto: string | number | null;
  quantidadeParcelas: number | null;
  quantidadeColaboradores: number | null;
  cnpj: string | null;
  telefone: string | null;
  telefone2: string | null;
  email: string | null;
  sindicatoPatronal: string | null;
  origem: string | null;
  observacoes: string | null;
  camposExtras: Record<string, unknown> | null;
  movimentadoEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

// Cabeçalhos aceitos na importação por planilha (CSV), em português e sem
// acento/maiúscula — a rota de import normaliza o cabeçalho recebido antes
// de comparar com esta lista. Ver app/api/crm/leads/importar/route.ts.
export const CAMPOS_IMPORTACAO: { chave: keyof LeadCrmResumo | "estagioLabel"; aliases: string[] }[] = [
  { chave: "nome", aliases: ["nome", "cliente", "lead", "razao social", "razaosocial"] },
  { chave: "valorEmAberto", aliases: ["valor em aberto", "valoremaberto", "valor", "valor devido", "valordevido"] },
  { chave: "quantidadeParcelas", aliases: ["quantidade de parcelas", "qtd parcelas", "parcelas", "quantidadeparcelas"] },
  {
    chave: "quantidadeColaboradores",
    aliases: ["quantidade de colaboradores", "qtd colaboradores", "colaboradores", "funcionarios", "quantidadecolaboradores"],
  },
  { chave: "cnpj", aliases: ["cnpj"] },
  { chave: "telefone", aliases: ["telefone", "telefone 1", "whatsapp", "celular"] },
  { chave: "telefone2", aliases: ["telefone 2", "telefone2", "telefone secundario", "telefonesecundario"] },
  { chave: "email", aliases: ["email", "e-mail"] },
  { chave: "sindicatoPatronal", aliases: ["sindicato patronal", "sindicatopatronal", "sindicato"] },
  { chave: "origem", aliases: ["origem", "canal", "fonte"] },
  { chave: "observacoes", aliases: ["observacoes", "observações", "obs", "notas"] },
  { chave: "estagioLabel", aliases: ["estagio", "estágio", "etapa", "coluna", "status"] },
];
