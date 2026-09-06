// ============================================================================
// API: /api/auth/logout
// POST -> encerra a sessão (apaga o cookie)
// ============================================================================
import { NextResponse } from "next/server";
import { encerrarSessao } from "../../../../lib/auth";

export async function POST() {
  await encerrarSessao();
  return NextResponse.json({ ok: true });
}
