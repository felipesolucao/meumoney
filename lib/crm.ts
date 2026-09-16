// ============================================================================
// CRM — constantes e helpers compartilhados (produto separado, ver app/crm)
// ----------------------------------------------------------------------------
// Fonte única de verdade para as colunas PADRÃO do Kanban: ordem, rótulo e
// cor de cada estágio. Usado tanto no servidor (rotas de API, validação)
// quanto no cliente (quadro, formulários, importação) — nunca duplique esta
// lista. Grupos CRIADOS PELO USUÁRIO (além destes 11) vivem só no banco, ver
// EstagioConfigCrm/mesclarEstagiosConfig logo abaixo.
// ============================================================================

export type EstagioInfo = {
  id: string;
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

// --------------------------------------------------------------------------
// Personalização por usuário das colunas do quadro (ordem, visibilidade,
// nome e — pra grupo customizado — cor) — ver model EstagioCrmConfig. Um
// grupo PADRÃO (dos 11 de ESTAGIOS) só tem linha no banco se o usuário mexeu
// nele; um grupo CUSTOMIZADO (criado por ele, "estagio" fora da lista
// padrão) existe inteiramente a partir dessa linha — sem ela, não existe.
// --------------------------------------------------------------------------
export type EstagioConfigCrm = EstagioInfo & {
  labelPadrao: string;
  ordem: number;
  visivel: boolean;
  nomePersonalizado: string | null;
  /** true = criado pelo usuário via "Gerenciar grupos", não é um dos 11 padrão */
  personalizado: boolean;
};

export type EstagioConfigCrmBruto = {
  estagio: string;
  ordem: number;
  visivel: boolean;
  nomePersonalizado: string | null;
  cor: string | null;
};

// Cores de fallback pros grupos customizados, na ordem em que vão sendo
// criados — cicla se o usuário criar mais grupos do que cores na lista.
export const PALETA_CORES_GRUPO = [
  "#3B82F6", "#A855F7", "#F59E0B", "#14B8A6", "#EC4899", "#84CC16", "#F43F5E", "#06B6D4",
];

export function corParaSuave(hex: string): string {
  const limpo = hex.replace("#", "");
  const normalizado = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo;
  const bigint = parseInt(normalizado, 16);
  if (Number.isNaN(bigint)) return "rgba(139,150,184,0.16)";
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

export function mesclarEstagiosConfig(configs: EstagioConfigCrmBruto[]): EstagioConfigCrm[] {
  const porEstagio = new Map(configs.map((c) => [c.estagio, c]));

  const padrao: EstagioConfigCrm[] = ESTAGIOS.map((info, indice) => {
    const cfg = porEstagio.get(info.id);
    const nomePersonalizado = cfg?.nomePersonalizado?.trim() || null;
    return {
      ...info,
      label: nomePersonalizado || info.label,
      labelPadrao: info.label,
      ordem: cfg?.ordem ?? indice,
      visivel: cfg?.visivel ?? true,
      nomePersonalizado,
      personalizado: false,
    };
  });

  const idsPadrao = new Set(ESTAGIOS_IDS);
  const customizados: EstagioConfigCrm[] = configs
    .filter((c) => !idsPadrao.has(c.estagio))
    .map((c) => {
      const label = c.nomePersonalizado?.trim() || "Novo grupo";
      const cor = c.cor || PALETA_CORES_GRUPO[0];
      return {
        id: c.estagio,
        label,
        labelPadrao: label,
        cor,
        corSuave: corParaSuave(cor),
        ordem: c.ordem,
        visivel: c.visivel,
        nomePersonalizado: c.nomePersonalizado?.trim() || null,
        personalizado: true,
      };
    });

  return [...padrao, ...customizados].sort((a, b) => a.ordem - b.ordem);
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

export function formatarDataCrm(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Remove acentos e normaliza maiúsculas/minúsculas — usado para comparar
// texto vindo de planilha ou de regra de automação sem depender de digitação
// idêntica ("Em Cobrança" === "em cobranca").
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// --------------------------------------------------------------------------
// Progresso (0-100) — "temperatura" do lead, definida manualmente ou por
// automação. Usada para destacar e filtrar cards no quadro.
// --------------------------------------------------------------------------
export const FAIXAS_PROGRESSO = [
  { id: "frio", label: "Frio", min: 0, max: 33, cor: "#60A5FA" },
  { id: "morno", label: "Morno", min: 34, max: 66, cor: "#FBBF24" },
  { id: "quente", label: "Quente", min: 67, max: 100, cor: "#F87171" },
] as const;

export type FaixaProgressoId = (typeof FAIXAS_PROGRESSO)[number]["id"];

export function faixaProgresso(progresso: number) {
  return FAIXAS_PROGRESSO.find((f) => progresso >= f.min && progresso <= f.max) ?? FAIXAS_PROGRESSO[0];
}

export type LeadCrmResumo = {
  id: string;
  nome: string;
  estagio: string;
  ordem: number;
  codigo: string | null;
  valorEmAberto: string | number | null;
  valorPago: string | number | null;
  quantidadeParcelas: number | null;
  quantidadeColaboradores: number | null;
  cnpj: string | null;
  telefone: string | null;
  telefone2: string | null;
  email: string | null;
  sindicatoPatronal: string | null;
  origem: string | null;
  observacoes: string | null;
  parcelaMaisAntiga: string | null;
  parcelaMaisRecente: string | null;
  dataUltimoContato: string | null;
  statusPlanilha: string | null;
  progresso: number;
  camposExtras: Record<string, unknown> | null;
  movimentadoEm: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type AtendimentoCrmResumo = {
  id: string;
  leadId: string;
  observacao: string;
  tentativaNumero: number | null;
  dataTratativa: string;
  // Só metadados do anexo — o conteúdo (arquivoDados) nunca trafega na
  // listagem, só na rota de download (ver .../atendimentos/[id]/arquivo).
  arquivoNome: string | null;
  arquivoTipo: string | null;
  arquivoTamanho: number | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type RegraAutomacaoCrm = {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  statusPlanilha: string | null;
  progressoMin: number | null;
  progressoMax: number | null;
  estagioDestino: string;
};

// Avalia as regras (em ordem) contra o status/progresso atual do lead e
// devolve o estágio pro qual ele deve ir, ou null se nenhuma regra bateu ou
// já é a coluna atual. Condições em branco (null) não restringem a regra.
export function encontrarEstagioAutomatico(
  regras: RegraAutomacaoCrm[],
  lead: { statusPlanilha: string | null; progresso: number; estagio: string },
): string | null {
  const ordenadas = [...regras].filter((r) => r.ativo).sort((a, b) => a.ordem - b.ordem);
  for (const regra of ordenadas) {
    if (regra.statusPlanilha && normalizarTexto(regra.statusPlanilha) !== normalizarTexto(lead.statusPlanilha || "")) continue;
    if (regra.progressoMin != null && lead.progresso < regra.progressoMin) continue;
    if (regra.progressoMax != null && lead.progresso > regra.progressoMax) continue;
    return regra.estagioDestino !== lead.estagio ? regra.estagioDestino : null;
  }
  return null;
}

// Cabeçalhos aceitos na importação por planilha (CSV), em português e sem
// acento/maiúscula — a rota de import normaliza o cabeçalho recebido antes
// de comparar com esta lista. Ver app/api/crm/leads/importar/route.ts.
export const CAMPOS_IMPORTACAO: { chave: keyof LeadCrmResumo | "estagioLabel"; aliases: string[] }[] = [
  { chave: "codigo", aliases: ["codigo", "código", "cod"] },
  { chave: "nome", aliases: ["nome", "associado", "cliente", "lead", "razao social", "razaosocial"] },
  { chave: "cnpj", aliases: ["cnpj"] },
  { chave: "valorEmAberto", aliases: ["valor em aberto", "valoremaberto", "valor", "valor devido", "valordevido"] },
  { chave: "quantidadeParcelas", aliases: ["quantidade de parcelas", "qtd parcelas", "parcelas", "quantidadeparcelas"] },
  {
    chave: "quantidadeColaboradores",
    aliases: [
      "quantidade de colaboradores",
      "qtd colaboradores",
      "colaboradores",
      "funcionarios",
      "quantidadecolaboradores",
      "n func. ativos",
      "n func ativos",
      "no func. ativos",
      "func. ativos",
      "func ativos",
      "funcionarios ativos",
    ],
  },
  { chave: "observacoes", aliases: ["observacoes", "observações", "observacao", "observação", "obs", "notas"] },
  { chave: "parcelaMaisAntiga", aliases: ["parcela mais antiga", "mais antiga", "parcelamaisantiga"] },
  { chave: "parcelaMaisRecente", aliases: ["parcela mais recente", "mais recente", "parcelamaisrecente"] },
  { chave: "statusPlanilha", aliases: ["status"] },
  { chave: "dataUltimoContato", aliases: ["data do ultimo contato", "data do último contato", "ultimo contato", "data"] },
  { chave: "valorPago", aliases: ["pago", "valor pago"] },
  { chave: "email", aliases: ["email", "e-mail"] },
  { chave: "sindicatoPatronal", aliases: ["sindicato patronal", "sindicatopatronal", "sindicato"] },
  { chave: "telefone", aliases: ["telefone", "telefone 1", "whatsapp", "celular"] },
  { chave: "telefone2", aliases: ["telefone 2", "telefone2", "telefone secundario", "telefonesecundario"] },
  { chave: "origem", aliases: ["origem", "canal", "fonte"] },
  { chave: "estagioLabel", aliases: ["estagio", "estágio", "etapa", "coluna"] },
];
