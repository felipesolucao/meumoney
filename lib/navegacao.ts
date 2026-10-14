// Aceita somente caminhos internos; nunca redireciona para outro domínio.
export function caminhoRetorno(valor: string | null, fallback: string): string {
  return valor?.startsWith("/") && !valor.startsWith("//") && !/[\\\r\n]/.test(valor)
    ? valor : fallback;
}

export function linkComRetorno(destino: string, origem: string): string {
  const url = new URL(destino, "https://meumoney.local");
  url.searchParams.set("voltar", origem);
  return url.pathname + url.search + url.hash;
}
