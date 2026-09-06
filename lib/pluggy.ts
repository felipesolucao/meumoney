// ============================================================================
// PLUGGY — autenticação server-side
// ----------------------------------------------------------------------------
// Troca CLIENT_ID/CLIENT_SECRET por uma API Key (válida por 2h) e a mantém em
// cache em memória entre chamadas, renovando um pouco antes de expirar.
// NUNCA exponha CLIENT_ID/CLIENT_SECRET nem a API Key pro frontend — só o
// Connect Token (gerado em app/api/pluggy/connect-token) vai pro navegador.
// ============================================================================

let cachedApiKey: string | null = null;
let apiKeyExpiraEm = 0;

export async function obterApiKeyPluggy(): Promise<string> {
  const agora = Date.now();
  if (cachedApiKey && agora < apiKeyExpiraEm) {
    return cachedApiKey;
  }

  const res = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao autenticar na Pluggy (${res.status}): ${await res.text()}`);
  }

  const dados = await res.json();
  cachedApiKey = dados.apiKey;
  apiKeyExpiraEm = agora + 1000 * 60 * 110; // renova 10min antes de expirar (validade real: 2h)
  return cachedApiKey;
}