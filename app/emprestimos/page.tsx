// ============================================================================
// PÁGINA: Empréstimos (DESATIVADA)
// ----------------------------------------------------------------------------
// Esta rota deixou de ser a página oficial — todo o conteúdo que existia
// aqui (resumo da carteira, parcelas de hoje, acesso rápido, contratos
// ativos) foi migrado para "/contratos" (ver app/contratos/page.tsx), que
// agora é a ÚNICA rota oficial para esse módulo.
//
// Mantemos essa rota só como redirecionamento — qualquer link antigo (favoritos,
// histórico do navegador, notificações já enviadas) continua funcionando em
// vez de dar 404. Pode ser removida por completo mais adiante.
// ============================================================================
import { redirect } from "next/navigation";

export default function Emprestimos() {
  redirect("/contratos");
}
