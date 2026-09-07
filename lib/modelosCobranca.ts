export const MODELOS_COBRANCA = [
  {
    tipo: "lembrete_amigavel",
    titulo: "Lembrete amigável",
    icone: "🔔",
    mensagem: `Olá, {nome}! 👋

Passando para lembrar com carinho que sua *parcela {numero}/{totalParcelas}* no valor de *{valor}* vence em *{vencimento}*{diasRestantesTexto}.

Se já efetuou o pagamento, por favor desconsidere esta mensagem. 🙏

Qualquer dúvida estou à disposição!`,
  },
  {
    tipo: "vence_hoje",
    titulo: "Vence hoje",
    icone: "🗓️",
    mensagem: `Olá, {nome}! 📅

Sua *parcela {numero}/{totalParcelas}* no valor de *{valor}* vence *hoje ({vencimento})*.

Para evitar multa e juros, efetue o pagamento ainda hoje.

Estou à disposição para enviar os dados de pagamento. 🙌`,
  },
  {
    tipo: "cobranca_atraso",
    titulo: "Cobrança de atraso",
    icone: "⚠️",
    mensagem: `Olá, {nome}.

Identifiquei que sua *parcela {numero}/{totalParcelas}* (vencimento {vencimento}) está em atraso há *{diasAtraso} dia(s)*.

• Valor original: {valor}
• Multa + juros: {acrescimo}
• *Total atualizado: {total}*

Por favor, regularize o quanto antes para evitar novos acréscimos. Se preferir, podemos conversar sobre uma renegociação. 🤝`,
  },
  {
    tipo: "agradecimento",
    titulo: "Agradecimento",
    icone: "✅",
    mensagem: `Olá, {nome}! ✅

Confirmamos o recebimento da sua *parcela {numero}/{totalParcelas}* no valor de *{valor}*.

Muito obrigado pela pontualidade e pela confiança! 🙏`,
  },
  {
    tipo: "proposta_negociacao",
    titulo: "Proposta de negociação",
    icone: "🤝",
    mensagem: `Olá, {nome}! 🤝

Notei que sua *parcela {numero}/{totalParcelas}* (venc. {vencimento}) está em aberto.

Podemos conversar sobre uma *renegociação* que caiba no seu momento atual? Estou aberto a ajustar valor e data.

Me avise quando puder, combinado?`,
  },
] as const;

export const VARIAVEIS_COBRANCA = ["{nome}", "{nomeCompleto}", "{numero}", "{totalParcelas}", "{valor}", "{total}", "{acrescimo}", "{vencimento}", "{diasAtraso}", "{diasRestantes}", "{diasRestantesTexto}"];

export type TipoModeloCobranca = (typeof MODELOS_COBRANCA)[number]["tipo"];

export function preencherModelo(mensagem: string, dados: Record<string, string | number>) {
  return mensagem.replace(/\{([a-zA-Z]+)\}/g, (variavel) => String(dados[variavel.slice(1)] ?? variavel));
}
