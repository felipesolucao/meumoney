-- ============================================================================
-- MIGRATION: add_usuarios_login
-- ----------------------------------------------------------------------------
-- O schema.prisma já tinha o modelo Usuario (login) e a coluna usuarioId em
-- Cliente/Contrato/Categoria/Conta/LancamentoRecorrente/Lancamento, mas essa
-- mudança nunca virou uma migration de fato — por isso a tabela "usuarios"
-- nunca existiu no banco de produção, mesmo com o Prisma achando que estava
-- tudo em dia.
--
-- Como as tabelas afetadas só tinham dados de teste (confirmado antes de
-- rodar isso), limpamos essas linhas de teste para poder adicionar a coluna
-- usuarioId como NOT NULL sem precisar inventar um "dono" para dados órfãos.
-- Se algum dia isso rodar sobre uma base com dados reais SEM ter confirmado
-- isso antes, NÃO use este arquivo sem revisar — ele apaga essas tabelas.
-- ============================================================================

-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('admin', 'usuario');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'usuario',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- Limpa dados de teste órfãos (sem usuarioId) nas tabelas que vão ganhar a
-- coluna obrigatória. CASCADE arrasta também os registros filhos (parcelas,
-- por exemplo, dependem de contratos).
TRUNCATE TABLE "clientes", "contratos", "categorias", "contas", "lancamentos_recorrentes", "lancamentos" CASCADE;

-- AlterTable: clientes
ALTER TABLE "clientes" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AlterTable: contratos
ALTER TABLE "contratos" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AlterTable: categorias
ALTER TABLE "categorias" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AlterTable: contas
ALTER TABLE "contas" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AlterTable: lancamentos_recorrentes
ALTER TABLE "lancamentos_recorrentes" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AlterTable: lancamentos
ALTER TABLE "lancamentos" ADD COLUMN "usuarioId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_recorrentes" ADD CONSTRAINT "lancamentos_recorrentes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
