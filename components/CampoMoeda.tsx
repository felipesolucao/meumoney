// ============================================================================
// COMPONENTE: Campo de valor em reais (R$ 0,00), com máscara de centavos
// ----------------------------------------------------------------------------
// Digita só números — cada dígito novo entra pela direita, como numa
// calculadora/maquininha (1 -> 0,01, 12 -> 0,12, 123 -> 1,23...). Extraído de
// app/contratos/novo/page.tsx pra ser reaproveitado em outros formulários que
// pedem um valor em dinheiro (ex.: ReceberPagamentoModal).
// ============================================================================
"use client";

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
