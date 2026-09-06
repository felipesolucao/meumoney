// ============================================================================
// SENHA — hash, verificação e validação do formato (6 dígitos numéricos)
// ----------------------------------------------------------------------------
// A senha é sempre um PIN de exatamente 6 números (igual a um PIN de banco).
// Isso é bem mais fácil de digitar no celular do que uma senha tradicional,
// mas tem bem menos combinações possíveis (1 milhão) — por isso o login
// (ver app/api/auth/login) limita tentativas por e-mail, pra dificultar um
// ataque de força bruta tentando todos os PINs possíveis.
// ============================================================================
import bcrypt from "bcryptjs";

const REGEX_SENHA = /^\d{6}$/;

export function senhaValida(senha: string): boolean {
  return REGEX_SENHA.test(senha);
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// ----------------------------------------------------------------------------
// Validação simples de e-mail (o suficiente para pegar erros de digitação
// óbvios — a confirmação de verdade é o próprio usuário conseguir logar).
// ----------------------------------------------------------------------------
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ----------------------------------------------------------------------------
// Limite simples de tentativas de login por e-mail, guardado em memória do
// processo. Reseta quando o servidor reinicia — não é um rate-limit à
// prova de balas, mas já dificulta bastante um ataque automatizado testando
// todos os PINs de 000000 a 999999 contra a mesma conta.
// ----------------------------------------------------------------------------
const tentativas = new Map<string, { contagem: number; desbloqueiaEm: number }>();
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 5 * 60 * 1000; // 5 minutos

export function loginBloqueado(email: string): boolean {
  const registro = tentativas.get(email);
  if (!registro) return false;
  if (Date.now() > registro.desbloqueiaEm) {
    tentativas.delete(email);
    return false;
  }
  return registro.contagem >= MAX_TENTATIVAS;
}

export function registrarTentativaFalha(email: string) {
  const registro = tentativas.get(email) ?? { contagem: 0, desbloqueiaEm: Date.now() + BLOQUEIO_MS };
  registro.contagem += 1;
  registro.desbloqueiaEm = Date.now() + BLOQUEIO_MS;
  tentativas.set(email, registro);
}

export function limparTentativas(email: string) {
  tentativas.delete(email);
}
