// ============================================================================
// PÁGINA: Login
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    // Validação básica antes de bater na API, com mensagem clara.
    if (!email.trim()) return setErro("Informe seu e-mail.");
    if (senha.length !== 6) return setErro("A senha deve ter exatamente 6 números.");

    setErro("");
    setEntrando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      // Tenta ler o corpo como JSON; se a API responder algo que não é JSON
      // (ex.: erro 500 puro do servidor), não deixa isso virar exceção solta.
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setErro(data.error || "Não foi possível entrar. Tente novamente em instantes.");
      }
    } catch {
      // Falha de rede (sem internet, servidor fora do ar, etc.)
      setErro("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="MeuMoney" width={96} height={96} className="mx-auto" priority />
        <h1 className="text-2xl font-bold mt-4">Entrar</h1>
        <p className="text-muted text-sm">Acesse sua conta financeira</p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">E-MAIL</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoCapitalize="none"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">SENHA (6 DÍGITOS)</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary text-center text-2xl tracking-[0.5em]"
            onKeyDown={(e) => e.key === "Enter" && entrar()}
          />
        </div>

        {erro && <p className="text-danger text-sm font-medium">{erro}</p>}

        <button onClick={entrar} disabled={entrando} className="btn-primary">
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-primary font-semibold">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
