// ============================================================================
// COMPONENTE: Campo de valor monetário com formatação e decimal automáticos
// ----------------------------------------------------------------------------
// Digita só números (como numa calculadora/maquininha) — os 2 últimos dígitos
// viram sempre os centavos e o separador de milhar aparece sozinho, sem
// precisar digitar vírgula nem ponto. O valor guardado no formulário
// continua um decimal simples ("1234.5"), só a exibição é mascarada.
//
// BUG CORRIGIDO: o campo lia TODOS os dígitos do texto formatado a cada
// tecla, sem levar em conta onde o cursor estava — clicar no meio do valor
// (ex.: "50.000,00") e digitar um dígito ali inseria esse dígito no meio da
// sequência de centavos, multiplicando o valor final por 10x, 100x etc. (o
// "número total" ficava com um bug visível). Como esse é um campo de
// "calculadora" (sempre edita a partir do último centavo, não por posição de
// texto), a correção é forçar o cursor pro final quando ele fica parado no
// meio do texto — assim qualquer tecla sempre se soma ao final da sequência
// de dígitos, nunca no meio.
//
// Uma seleção de texto de verdade (Ctrl/Cmd+A, arrastar o mouse) é
// preservada: forçar o cursor pro final também nesse caso destruía a
// seleção antes da tecla seguinte substituí-la, fazendo o dígito digitado
// ser inserido no final em vez de substituir o valor selecionado.
// ============================================================================
"use client";

function centavosParaExibicao(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export default function CampoValorMonetario({
  label,
  valor,
  onMudar,
}: {
  label: string;
  valor: string;
  onMudar: (novoValor: string) => void;
}) {
  const centavosAtual = valor === "" ? 0 : Math.round(Number(valor) * 100);
  const exibicao = valor === "" ? "" : centavosParaExibicao(centavosAtual);

  return (
    <div className="crm-field">
      <label className="crm-label">{label}</label>
      <div className="crm-input-prefixo-wrap">
        <span className="crm-input-prefixo">R$</span>
        <input
          className="crm-input crm-input-com-prefixo"
          inputMode="decimal"
          placeholder="0,00"
          value={exibicao}
          onFocus={moverCursorParaFim}
          onClick={moverCursorParaFim}
          onKeyUp={moverCursorParaFim}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "");
            if (!digitos) {
              onMudar("");
              return;
            }
            const centavos = parseInt(digitos, 10);
            onMudar((centavos / 100).toFixed(2));
          }}
        />
      </div>
    </div>
  );
}
