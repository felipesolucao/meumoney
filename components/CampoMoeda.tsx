// ============================================================================
// COMPONENTE: Campo de valor em reais (R$ 0,00), com máscara de centavos
// ----------------------------------------------------------------------------
// Digita só números — cada dígito novo entra pela direita, como numa
// calculadora/maquininha (1 -> 0,01, 12 -> 0,12, 123 -> 1,23...). Extraído de
// app/contratos/novo/page.tsx pra ser reaproveitado em outros formulários que
// pedem um valor em dinheiro (ex.: ReceberPagamentoModal).
//
// BUG CORRIGIDO: o campo lia TODOS os dígitos do texto formatado a cada
// tecla, sem levar em conta onde o cursor estava — clicar no meio do valor
// (ex.: "50.000,00") e digitar um dígito ali inseria esse dígito no meio da
// sequência de centavos, multiplicando o valor final por 10x, 100x etc. Como
// este é um campo de "calculadora" (sempre edita a partir do último centavo,
// não por posição de texto), a correção é forçar o cursor pro final sempre
// que ele ficar parado no meio do texto (clique/foco que só posiciona um
// caret) — assim qualquer tecla sempre se soma ao final da sequência de
// dígitos, nunca no meio.
//
// Uma seleção de texto de verdade (Ctrl/Cmd+A, arrastar o mouse) é
// preservada: forçar o cursor pro final também nesse caso destruía a seleção
// antes da tecla seguinte substituí-la, fazendo o dígito digitado ser
// inserido no final em vez de substituir o valor selecionado.
// ============================================================================
"use client";

function moverCursorParaFim(e: React.SyntheticEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  // Precisa ser no próximo frame — no momento do evento o navegador ainda
  // não aplicou a seleção padrão (clique/foco/seleção via teclado), que
  // sobrescreveria isto.
  requestAnimationFrame(() => {
    if (el.selectionStart !== el.selectionEnd) return;
    const fim = el.value.length;
    el.setSelectionRange(fim, fim);
  });
}

export default function CampoMoeda({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (valor: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-extrabold text-primary">R$</span>
      <input
        value={value}
        onFocus={moverCursorParaFim}
        onClick={moverCursorParaFim}
        onKeyUp={moverCursorParaFim}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "");
          onChange(digitos ? digitosParaValorFormatado(digitos) : "");
        }}
        placeholder="0,00"
        inputMode="numeric"
        autoFocus={autoFocus}
        className="w-full rounded-md border-2 border-transparent bg-card pl-14 pr-4 py-4 text-3xl font-extrabold text-primary outline-none focus:border-primary"
      />
    </div>
  );
}

function digitosParaValorFormatado(digitos: string) {
  return (Number(digitos || "0") / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function valorFormatadoParaNumero(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  return digitos ? Number(digitos) / 100 : 0;
}

export function numeroParaValorFormatado(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
