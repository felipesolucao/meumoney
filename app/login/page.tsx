// ============================================================================
// PÁGINA: Login
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
<<<<<<< HEAD
import Image from "next/image";
=======
>>>>>>> 470fa79c11777a570bd09534c81caf2c38e22bb8

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    setEntrando(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    setEntrando(false);

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível entrar.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6">
      <div className="mb-8 text-center">
<<<<<<< HEAD
        <Image src="/logo.png" alt="MeuMoney" width={96} height={96} className="mx-auto" priority />
=======
        <div className="avatar !w-16 !h-16 !text-2xl mx-auto">JX</div>
>>>>>>> 470fa79c11777a570bd09534c81caf2c38e22bb8
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
