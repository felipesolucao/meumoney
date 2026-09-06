// ============================================================================
// LÓGICA DE NEGÓCIO — cálculo de contratos, parcelas e juros
// ----------------------------------------------------------------------------
// Este arquivo concentra TODA a matemática financeira do app. Se um dia for
// preciso mudar a forma de calcular juros (ex: juros compostos em vez de
// simples), é aqui que se mexe.
// ============================================================================

export type TipoEmprestimo = "fixo" | "juros";
export type Frequencia = "diaria" | "semanal" | "quinzenal" | "mensal";

export interface ParcelaCalculada {
  numero: number;
  valor: number;
  vencimento: Date;
}

export interface ResultadoCalculoContrato {
  valorTotal: number;
  valorLucro: number;
  valorParcela: number;
  parcelas: ParcelaCalculada[];
}

// ----------------------------------------------------------------------------
// Soma um intervalo de tempo a uma data, de acordo com a frequência escolhida.
// Usado para gerar a data de vencimento de cada parcela.
// ----------------------------------------------------------------------------
export function adicionarIntervalo(data: Date, frequencia: Frequencia, vezes: number): Date {
  const nova = new Date(data);
  switch (frequencia) {
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
  }
  return nova;
}

// ----------------------------------------------------------------------------
// Calcula o valor total do contrato, o lucro e a lista de parcelas.
//
// Regra de juros: juros simples sobre o valor emprestado, proporcional ao
// número de parcelas (cada parcela "carrega" 1 período de juros).
//   valorTotal = valorEmprestado * (1 + (jurosAoMes / 100) * numeroParcelas)
//
// "Valor Fixo" não aplica juros: o valor emprestado já é o valor a receber,
// apenas dividido no número de parcelas informado (lucro = 0).
// ----------------------------------------------------------------------------
export function calcularContrato(params: {
  valorEmprestado: number;
  tipoEmprestimo: TipoEmprestimo;
  jurosAoMes: number;
  numeroParcelas: number;
  frequencia: Frequencia;
  dataPrimeiraParcela: Date;
}): ResultadoCalculoContrato {
  const { valorEmprestado, tipoEmprestimo, jurosAoMes, numeroParcelas, frequencia, dataPrimeiraParcela } = params;

  let valorTotal: number;
  if (tipoEmprestimo === "juros") {
    const juros = jurosAoMes / 100;
    valorTotal = valorEmprestado * (1 + juros * numeroParcelas);
  } else {
    valorTotal = valorEmprestado;
  }

  const valorLucro = Math.max(valorTotal - valorEmprestado, 0);

  // Divide o valor total em parcelas iguais, ajustando centavos na última
  // parcela para que a soma bata exatamente com o valor total.
  const valorParcelaBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
  const parcelas: ParcelaCalculada[] = [];
  let acumulado = 0;

  for (let i = 1; i <= numeroParcelas; i++) {
    const ehUltima = i === numeroParcelas;
    const valor = ehUltima ? Math.round((valorTotal - acumulado) * 100) / 100 : valorParcelaBase;
    acumulado += valor;

    parcelas.push({
      numero: i,
      valor,
      vencimento: adicionarIntervalo(dataPrimeiraParcela, frequencia, i - 1),
    });
  }

  return {
    valorTotal: Math.round(valorTotal * 100) / 100,
    valorLucro: Math.round(valorLucro * 100) / 100,
    valorParcela: valorParcelaBase,
    parcelas,
  };
}

// ----------------------------------------------------------------------------
// Gera um código curto para o contrato, no formato usado no app (#5B32E7).
// ----------------------------------------------------------------------------
export function gerarCodigoContrato(): string {
  const chars = "0123456789ABCDEF";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return `#${codigo}`;
}

// ----------------------------------------------------------------------------
// Determina o status atual de uma parcela com base na data de vencimento.
// ----------------------------------------------------------------------------
export function statusDaParcela(vencimento: Date, pago: boolean, hoje: Date = new Date()): "a_vencer" | "atrasado" | "pago" {
  if (pago) return "pago";
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const v = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  return v < h ? "atrasado" : "a_vencer";
}

// ----------------------------------------------------------------------------
// Calcula o status "efetivo" de um contrato a partir de suas parcelas, sem
// depender de um job em segundo plano para atualizar o campo no banco.
// ----------------------------------------------------------------------------
export function statusDoContrato(
  parcelas: { vencimento: Date | string; status: string }[],
  hoje: Date = new Date()
): "em_dia" | "atrasado" | "quitado" {
  if (parcelas.length > 0 && parcelas.every((p) => p.status === "pago")) return "quitado";
  const algumaAtrasada = parcelas.some(
    (p) => p.status !== "pago" && statusDaParcela(new Date(p.vencimento), false, hoje) === "atrasado"
  );
  return algumaAtrasada ? "atrasado" : "em_dia";
}

// ----------------------------------------------------------------------------
// Formatação — moeda brasileira e datas dd/mm/yyyy
// ----------------------------------------------------------------------------
// Aceita number, string OU o tipo Decimal do Prisma (que vem direto do banco
// para campos monetários) — assim funciona igual em qualquer tela, sem
// precisar converter manualmente antes de cada chamada.
export function formatarMoeda(valor: number | string | { toString(): string }): string {
  const n = typeof valor === "number" ? valor : parseFloat(valor.toString());
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function iniciais(nome: string): string {
  return nome.trim().charAt(0).toUpperCase();
}

// ----------------------------------------------------------------------------
// Rótulo de dia usado para agrupar listas por data (ex: "Sábado, 19"),
// no mesmo padrão do app de referência. Usado tanto na lista de lançamentos
// quanto na timeline de histórico.
// ----------------------------------------------------------------------------
export function rotuloDia(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "UTC" });
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${dia}`;
}

// ----------------------------------------------------------------------------
// Agrupa uma lista qualquer por dia (chave = data em yyyy-mm-dd), mantendo a
// ordem em que os itens chegaram — a lista já deve vir ordenada (desc/asc)
// antes de passar por aqui.
// ----------------------------------------------------------------------------
export function agruparPorDia<T>(itens: T[], obterData: (item: T) => Date | string): { rotulo: string; itens: T[] }[] {
  const grupos: { chave: string; rotulo: string; itens: T[] }[] = [];

  for (const item of itens) {
    const data = obterData(item);
    const d = typeof data === "string" ? new Date(data) : data;
    const chave = d.toISOString().slice(0, 10);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ chave, rotulo: rotuloDia(d), itens: [item] });
    }
  }

  return grupos.map(({ rotulo, itens }) => ({ rotulo, itens }));
}
