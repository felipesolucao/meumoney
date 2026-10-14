"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { caminhoRetorno } from "../lib/navegacao";
import { IconArrowLeft } from "./Icons";

function Seta({ href }: { href: string }) {
  return <Link href={href} replace aria-label="Voltar" className="icon-btn text-foreground"><IconArrowLeft size={19} /></Link>;
}

function VoltarOrigem({ href }: { href: string }) {
  const searchParams = useSearchParams();
  return <Seta href={caminhoRetorno(searchParams.get("voltar"), href)} />;
}

export default function BotaoVoltar({ href }: { href: string }) {
  return <Suspense fallback={<Seta href={href} />}><VoltarOrigem href={href} /></Suspense>;
}
