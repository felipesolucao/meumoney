"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { linkComRetorno } from "../lib/navegacao";

type Props = ComponentProps<typeof Link>;

function LinkOrigem(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const origem = pathname + (query ? `?${query}` : "");
  const href = typeof props.href === "string" && /^\/(contratos|clientes)\/[^/?]+/.test(props.href)
    ? linkComRetorno(props.href, origem)
    : props.href;
  return <Link {...props} href={href} />;
}

export default function LinkComRetorno(props: Props) {
  return <Suspense fallback={<Link {...props} />}><LinkOrigem {...props} /></Suspense>;
}
