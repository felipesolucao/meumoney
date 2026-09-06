// ============================================================================
// LÓGICA DE NEGÓCIO — módulo de Controle Financeiro (receitas e despesas)
// ----------------------------------------------------------------------------
// Concentra o cálculo de recorrência (contas fixas e parceladas) e o status
// de pagamento, igual ao lib/calculos.ts faz para os contratos de empréstimo.
// ============================================================================

export type TipoLancamento = "receita" | "despesa";
export type OrigemFinanceira = "pessoal" | "empresarial";
export type StatusLancamento = "pendente" | "pago";
export type TipoFimRecorrencia = "sem_fim" | "data_fim" | "parcelas";
export type PeriodicidadeLancamento = "diaria" | "semanal" | "quinzenal" | "mensal" | "anual";

// Quando a recorrência é "sem_fim" (conta fixa contínua, sem data de término),
// não dá para gerar infinitas ocorrências de uma vez. Geramos um número fixo
// de ocorrências à frente; a rota de API completa automaticamente o horizonte
// sempre que alguém abre a tela financeira (ver gerarProximasOcorrencias).
export const HORIZONTE_SEM_FIM = 12;

export interface OcorrenciaCalculada {
  descricao: string;
  valor: number;
  dataVencimento: Date;
  numeroParcela: number | null;
}

// ----------------------------------------------------------------------------
// Soma um intervalo de tempo a uma data, de acordo com a periodicidade.
// ----------------------------------------------------------------------------
export function adicionarPeriodo(data: Date, periodicidade: PeriodicidadeLancamento, vezes: number): Date {
  const nova = new Date(data);
  switch (periodicidade) {
    case "diaria":
      nova.setDate(nova.getDate() + 1 * vezes);
      break;
    case "semanal":
      nova.setDate(nova.getDate() + 7 * vezes);
      break;
    case "quinzenal":
      nova.setDate(nova.getDate() + 15 * vezes);
      break;
    case "mensal":
      nova.setMonth(nova.getMonth() + 1 * vezes);
      break;
    case "anual":
      nova.setFullYear(nova.getFullYear() + 1 * vezes);
      break;
  }
  return nova;
}

// ----------------------------------------------------------------------------
// Gera as ocorrências (lançamentos) de uma regra de recorrência, a partir de
// uma data de referência. Usada tanto na criação inicial quanto para
// completar o horizonte de contas "sem_fim" com o passar do tempo.
//
//   sem_fim  -> gera as próximas HORIZONTE_SEM_FIM ocorrências a partir de "desde"
//   data_fim -> gera todas as ocorrências entre "desde" e a dataFim
//   parcelas -> gera as parcelas que faltam, começando em numeroParcelaInicial
// ----------------------------------------------------------------------------
export function gerarOcorrencias(params: {
  descricao: string;
  valor: number;
  periodicidade: PeriodicidadeLancamento;
  tipoFim: TipoFimRecorrencia;
  desde: Date; // primeira data de vencimento a considerar
  dataFim?: Date | null;
  numeroParcelas?: number | null;
  numeroParcelaInicial?: number; // de onde continuar, ao completar o horizonte
}): OcorrenciaCalculada[] {
  const { descricao, valor, periodicidade, tipoFim, desde, dataFim, numeroParcelas } = params;
  const numeroParcelaInicial = params.numeroParcelaInicial ?? 1;
  const ocorrencias: OcorrenciaCalculada[] = [];

  if (tipoFim === "parcelas") {
    const total = numeroParcelas ?? 1;
    for (let i = numeroParcelaInicial; i <= total; i++) {
      ocorrencias.push({
        descricao: `${descricao} (${i}/${total})`,
        valor,
        dataVencimento: adicionarPeriodo(desde, periodicidade, i - numeroParcelaInicial),
        numeroParcela: i,
      });
    }
  } else if (tipoFim === "data_fim" && dataFim) {
    let i = 0;
    let data = desde;
    while (data <= dataFim) {
      ocorrencias.push({ descricao, valor, dataVencimento: data, numeroParcela: null });
      i++;
      data = adicionarPeriodo(desde, periodicidade, i);
    }
  } else {
    // sem_fim: gera um lote fixo de ocorrências futuras
    for (let i = 0; i < HORIZONTE_SEM_FIM; i++) {
      ocorrencias.push({
        descricao,
        valor,
        dataVencimento: adicionarPeriodo(desde, periodicidade, i),
        numeroParcela: null,
      });
    }
  }

  return ocorrencias;
}

// ----------------------------------------------------------------------------
// Determina o status "efetivo" de um lançamento (considera atraso mesmo que
// o campo salvo no banco ainda esteja como "pendente").
// ----------------------------------------------------------------------------
export function statusEfetivoLancamento(
  status: StatusLancamento,
  dataVencimento: Date | string,
  hoje: Date = new Date()
): "pendente" | "atrasado" | "pago" {
  if (status === "pago") return "pago";
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const v = new Date(dataVencimento);
  const vSemHora = new Date(v.getFullYear(), v.getMonth(), v.getDate());
  return vSemHora < h ? "atrasado" : "pendente";
}

// ----------------------------------------------------------------------------
// Formatação — reaproveita o mesmo padrão usado no restante do app.
// ----------------------------------------------------------------------------
export function formatarMoeda(valor: number | string | { toString(): string }): string {
  const n = typeof valor === "number" ? valor : parseFloat(valor.toString());
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// ----------------------------------------------------------------------------
// Rótulos em português usados nos formulários e listas.
// ----------------------------------------------------------------------------
export const LABEL_PERIODICIDADE: Record<PeriodicidadeLancamento, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  anual: "Anual",
};

export const LABEL_TIPO_FIM: Record<TipoFimRecorrencia, string> = {
  sem_fim: "Fixa, sem data de fim",
  data_fim: "Repete até uma data",
  parcelas: "Número fixo de parcelas",
};
