// ============================================================================
// COMPONENTE: Badge de status
// ----------------------------------------------------------------------------
// Usado para "Score médio", "Em dia", "A vencer", "Atrasado", "Pago" etc.
// As cores seguem o padrão: verde = positivo, âmbar = pendente, vermelho = risco.
// ============================================================================

type Tom = "verde" | "amber" | "vermelho" | "neutro";

const TONS: Record<Tom, { bg: string; texto: string }> = {
  verde: { bg: "#E3F5E9", texto: "#2FA85A" },
  amber: { bg: "#FDECC8", texto: "#C98A1D" },
  vermelho: { bg: "#FBE4E2", texto: "#E4544A" },
  neutro: { bg: "#EEF1F0", texto: "#6B7280" },
};

export default function Badge({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  const cores = TONS[tom];
  return (
    <span className="badge" style={{ background: cores.bg, color: cores.texto }}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Mapeia os status internos para o tom visual e o texto em português.
// ----------------------------------------------------------------------------
export function tomEStatusContrato(status: string): { tom: Tom; texto: string } {
  switch (status) {
    case "em_dia":
      return { tom: "verde", texto: "Em dia" };
    case "atrasado":
      return { tom: "vermelho", texto: "Atrasado" };
    case "quitado":
      return { tom: "neutro", texto: "Quitado" };
    default:
      return { tom: "neutro", texto: status };
  }
}

export function tomEStatusParcela(status: string): { tom: Tom; texto: string } {
  switch (status) {
    case "a_vencer":
      return { tom: "amber", texto: "A vencer" };
    case "atrasado":
      return { tom: "vermelho", texto: "Atrasado" };
    case "pago":
      return { tom: "verde", texto: "Pago" };
    default:
      return { tom: "neutro", texto: status };
  }
}

export function tomEScore(score: string): { tom: Tom; texto: string } {
  switch (score) {
    case "alto":
      return { tom: "verde", texto: "Score alto" };
    case "baixo":
      return { tom: "vermelho", texto: "Score baixo" };
    default:
      return { tom: "amber", texto: "Score médio" };
  }
}

// ----------------------------------------------------------------------------
// Situação cadastral do cliente — independente do score de crédito.
// ----------------------------------------------------------------------------
export function tomESituacaoCliente(situacao: string): { tom: Tom; texto: string } {
  switch (situacao) {
    case "ativo":
      return { tom: "verde", texto: "Ativo" };
    case "inadimplente":
      return { tom: "vermelho", texto: "Inadimplente" };
    case "inativo":
      return { tom: "neutro", texto: "Inativo" };
    default:
      return { tom: "neutro", texto: situacao };
  }
}

// ----------------------------------------------------------------------------
// Status de um lançamento do módulo financeiro (pendente/atrasado/pago).
// Recebe o status "efetivo" já calculado por statusEfetivoLancamento().
// ----------------------------------------------------------------------------
export function tomEStatusLancamento(statusEfetivo: "pendente" | "atrasado" | "pago"): { tom: Tom; texto: string } {
  switch (statusEfetivo) {
    case "pago":
      return { tom: "verde", texto: "Pago" };
    case "atrasado":
      return { tom: "vermelho", texto: "Atrasado" };
    default:
      return { tom: "amber", texto: "Pendente" };
  }
}
