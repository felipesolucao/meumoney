-- Estágio deixa de ser um enum fixo (EstagioLeadCrm) e vira texto livre, pra
-- permitir grupos criados pelo próprio usuário (ver "Gerenciar grupos" no
-- CRM) além dos 11 padrão. Os valores já gravados são strings válidas do
-- enum, então a conversão para TEXT preserva tudo sem perda de dado.

-- AlterTable: crm_leads.estagio (enum -> text, mantendo o default)
ALTER TABLE "crm_leads" ALTER COLUMN "estagio" DROP DEFAULT;
ALTER TABLE "crm_leads" ALTER COLUMN "estagio" TYPE TEXT USING "estagio"::text;
ALTER TABLE "crm_leads" ALTER COLUMN "estagio" SET DEFAULT 'primeira_tentativa';

-- AlterTable: crm_automacoes.estagioDestino (enum -> text)
ALTER TABLE "crm_automacoes" ALTER COLUMN "estagioDestino" TYPE TEXT USING "estagioDestino"::text;

-- AlterTable: crm_estagios_config.estagio (enum -> text) + nova coluna "cor"
-- (só usada por grupo customizado — grupo padrão usa a cor fixa de ESTAGIOS)
ALTER TABLE "crm_estagios_config" ALTER COLUMN "estagio" TYPE TEXT USING "estagio"::text;
ALTER TABLE "crm_estagios_config" ADD COLUMN "cor" TEXT;

-- Nenhuma coluna mais referencia o enum — pode ser removido.
DROP TYPE "EstagioLeadCrm";
