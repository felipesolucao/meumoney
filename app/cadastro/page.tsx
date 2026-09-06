// ============================================================================
// PÁGINA: Cadastro
// ----------------------------------------------------------------------------
// Exige e-mail, senha de 6 dígitos e telefone (WhatsApp). Toda conta criada
// aqui nasce com papel "usuario" — a conta de admin não é criada por esta
// tela (ver instruções no README, seção "Conta de administrador").
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function cadastrar() {
    // Validações locais primeiro, com mensagens específicas.
    if (!email.trim()) return setErro("Informe seu e-mail.");
    if (!telefone.trim()) return setErro("Informe seu telefone (WhatsApp).");
    if (senha.length !== 6) return setErro("A senha deve ter exatamente 6 números.");
    if (senha !== confirmarSenha) return setErro("As senhas não são iguais.");

    setErro("");
    setSalvando(true);

    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, telefone }),
      });

      // Protege contra respostas de erro que não vêm em JSON (ex.: 500 puro).
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
        setErro(data.error || "Não foi possível criar a conta. Tente novamente em instantes.");
      }
    } catch {
      // Falha de rede (sem internet, servidor fora do ar, etc.)
      setErro("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <Image src="/logo.png" alt="MeuMoney" width={96} height={96} className="mx-auto" priority unoptimized />
        <h1 className="text-2xl font-bold mt-4">Criar conta</h1>
        <p className="text-muted text-sm">Leva menos de um minuto</p>
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
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">TELEFONE (WHATSAPP)</p>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(62) 99999-9999"
            inputMode="tel"
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
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CONFIRME A SENHA</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary text-center text-2xl tracking-[0.5em]"
            onKeyDown={(e) => e.key === "Enter" && cadastrar()}
          />
        </div>

        {erro && <p className="text-danger text-sm font-medium">{erro}</p>}

        <button onClick={cadastrar} disabled={salvando} className="btn-primary">
          {salvando ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
