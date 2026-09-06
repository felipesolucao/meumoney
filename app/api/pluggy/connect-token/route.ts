import { NextResponse } from "next/server";
import { obterApiKeyPluggy } from "../../../../lib/pluggy";
import { obterSessao } from "../../../../lib/auth";

export async function POST() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const apiKey = await obterApiKeyPluggy();

  const res = await fetch("https://api.pluggy.ai/connect_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({
      clientUserId: sessao.id,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/pluggy/webhook`,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Falha ao gerar connect token." }, { status: 502 });
  }

  const dados = await res.json();
  return NextResponse.json({ connectToken: dados.accessToken });
}
