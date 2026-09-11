export type Recebivel = {
  id: string; descricao: string; valor: string; valorPago: string | null;
  status: "pendente" | "pago"; tipo: "receita"; origem: "pessoal" | "empresarial";
  dataVencimento: string; dataPagamento: string | null; numeroParcela: number | null;
  recorrenteId: string | null; observacoes: string | null;
  categoria: { nome: string; icone: string } | null;
  conta: { nome: string; icone: string } | null;
};

export type DetalheRecebivel = {
  selecionado: Recebivel;
  ocorrencias: Recebivel[];
  recorrencia: { periodicidade: string; tipoFim: string; numeroParcelas: number | null } | null;
};

export function valoresRecebivel(item: Recebivel) {
  const total = Math.round(Number(item.valor) * 100);
  const recebido = Math.round(Number(item.valorPago ?? (item.status === "pago" ? item.valor : 0)) * 100);
  return { total: total / 100, recebido: recebido / 100, restante: Math.max(0, total - recebido) / 100 };
}

export function resumoRecebiveis(itens: Recebivel[]) {
  const somas = itens.reduce((resumo, item) => {
    const valores = valoresRecebivel(item);
    return { total: resumo.total + Math.round(valores.total * 100), recebido: resumo.recebido + Math.round(valores.recebido * 100), restante: resumo.restante + Math.round(valores.restante * 100) };
  }, { total: 0, recebido: 0, restante: 0 });
  return { total: somas.total / 100, recebido: somas.recebido / 100, restante: somas.restante / 100 };
}

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (valor: string) => new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function mensagemRecebivel(detalhe: DetalheRecebivel, nome: string, modo: "cobranca" | "proposta") {
  const item = detalhe.selecionado;
  const valores = valoresRecebivel(item);
  const saudacao = nome.trim() ? `Olá, ${nome.trim()}!` : "Olá!";
  if (modo === "cobranca") {
    if (valores.restante === 0) return `${saudacao}\n\nConfirmamos o recebimento de *${item.descricao}*, no valor de *${moeda(valores.recebido)}*.\n\nObrigado!`;
    return `${saudacao}\n\nSegue a cobrança de *${item.descricao}*${item.numeroParcela ? ` — parcela ${item.numeroParcela}` : ""}.\n\nValor: ${moeda(valores.total)}\nJá recebido: ${moeda(valores.recebido)}\n*Saldo a receber: ${moeda(valores.restante)}*\nVencimento: ${data(item.dataVencimento)}\n\nSe já efetuou o pagamento, por favor envie o comprovante. Estou à disposição!`;
  }
  const resumo = resumoRecebiveis(detalhe.ocorrencias);
  const cronograma = detalhe.ocorrencias.map((parcela, i) => {
    const valor = valoresRecebivel(parcela);
    return `${parcela.numeroParcela ?? i + 1}. ${moeda(valor.total)} — ${data(parcela.dataVencimento)}${valor.restante === 0 ? " (recebido)" : valor.recebido > 0 ? ` (restam ${moeda(valor.restante)})` : ""}`;
  }).join("\n");
  return `${saudacao}\n\nSegue a *proposta de contrato* referente a *${item.descricao}*:\n\n${detalhe.recorrencia?.tipoFim === "sem_fim" ? "Total das ocorrências cadastradas" : "Valor total"}: ${moeda(resumo.total)}\nJá recebido: ${moeda(resumo.recebido)}\nSaldo a receber: ${moeda(resumo.restante)}\n\n*Cronograma de pagamentos:*\n${cronograma}${detalhe.recorrencia?.tipoFim === "sem_fim" ? "\n\nRecorrência sem data final: o cronograma acima contém apenas as ocorrências já cadastradas." : ""}\n\nConfira os valores e vencimentos e me confirme se está de acordo com a proposta.`;
}

export function linkWhatsApp(telefone: string, mensagem: string) {
  let numero = telefone.replace(/\D/g, "");
  if (!numero) return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  if (!telefone.trim().startsWith("+") && (numero.length === 10 || numero.length === 11)) numero = `55${numero}`;
  if (!/^[1-9]\d{7,14}$/.test(numero)) throw new Error("Informe o WhatsApp com DDD ou deixe em branco para escolher o contato.");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
