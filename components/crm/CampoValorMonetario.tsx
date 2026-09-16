// ============================================================================
// COMPONENTE: Campo de valor monetário com formatação e decimal automáticos
// ----------------------------------------------------------------------------
// Digita só números (como numa calculadora/maquininha) — os 2 últimos dígitos
// viram sempre os centavos e o separador de milhar aparece sozinho, sem
// precisar digitar vírgula nem ponto. O valor guardado no formulário
// continua um decimal simples ("1234.5"), só a exibição é mascarada.
// ============================================================================
"use client";

function centavosParaExibicao(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
