/*
  Warnings:

  - A unique constraint covering the columns `[pluggyAccountId]` on the table `contas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pluggyTransactionId]` on the table `lancamentos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "pluggyAccountId" TEXT,
ADD COLUMN     "pluggyItemId" TEXT,
ADD COLUMN     "pluggyNomeInstituicao" TEXT,
ADD COLUMN     "pluggyStatus" TEXT,
ADD COLUMN     "ultimaSincronizacao" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lancamentos" ADD COLUMN     "editadoManualmente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origemPluggy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pluggyTransactionId" TEXT;

-- CreateTable
CREATE TABLE "pluggy_transacoes_excluidas" (
    "id" TEXT NOT NULL,
    "pluggyTransactionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pluggy_transacoes_excluidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pluggy_transacoes_excluidas_pluggyTransactionId_key" ON "pluggy_transacoes_excluidas"("pluggyTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "contas_pluggyAccountId_key" ON "contas"("pluggyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_pluggyTransactionId_key" ON "lancamentos"("pluggyTransactionId");
