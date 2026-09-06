/*
  Warnings:

  - You are about to drop the column `pluggyAccountId` on the `contas` table. All the data in the column will be lost.
  - You are about to drop the column `pluggyItemId` on the `contas` table. All the data in the column will be lost.
  - You are about to drop the column `pluggyNomeInstituicao` on the `contas` table. All the data in the column will be lost.
  - You are about to drop the column `pluggyStatus` on the `contas` table. All the data in the column will be lost.
  - You are about to drop the column `ultimaSincronizacao` on the `contas` table. All the data in the column will be lost.
  - You are about to drop the column `editadoManualmente` on the `lancamentos` table. All the data in the column will be lost.
  - You are about to drop the column `origemPluggy` on the `lancamentos` table. All the data in the column will be lost.
  - You are about to drop the column `pluggyTransactionId` on the `lancamentos` table. All the data in the column will be lost.
  - You are about to drop the `pluggy_transacoes_excluidas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "contas_pluggyAccountId_key";

-- DropIndex
DROP INDEX "lancamentos_pluggyTransactionId_key";

-- AlterTable
ALTER TABLE "contas" DROP COLUMN "pluggyAccountId",
DROP COLUMN "pluggyItemId",
DROP COLUMN "pluggyNomeInstituicao",
DROP COLUMN "pluggyStatus",
DROP COLUMN "ultimaSincronizacao";

-- AlterTable
ALTER TABLE "lancamentos" DROP COLUMN "editadoManualmente",
DROP COLUMN "origemPluggy",
DROP COLUMN "pluggyTransactionId";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "nome" TEXT NOT NULL DEFAULT 'Usuário';

-- DropTable
DROP TABLE "pluggy_transacoes_excluidas";
