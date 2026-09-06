// ============================================================================
// COMPONENTE: Botão de voltar (seta), usado no topo de quase todas as telas
// ============================================================================
import Link from "next/link";
import { IconArrowLeft } from "./Icons";

export default function BotaoVoltar({ href }: { href: string }) {
  return (
    <Link href={href} className="icon-btn text-foreground">
      <IconArrowLeft size={19} />
    </Link>
  );
}
