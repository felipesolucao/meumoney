-- DropForeignKey
ALTER TABLE "contratos" DROP CONSTRAINT IF EXISTS "contratos_lancamentoDesembolsoId_fkey";

-- DropForeignKey
ALTER TABLE "parcelas" DROP CONSTRAINT IF EXISTS "parcelas_lancamentoRetornoId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "contratos_lancamentoDesembolsoId_key";

-- DropIndex
DROP INDEX IF EXISTS "parcelas_lancamentoRetornoId_key";

-- AlterTable
ALTER TABLE "contratos" DROP COLUMN IF EXISTS "lancamentoDesembolsoId";

-- AlterTable
ALTER TABLE "parcelas" DROP COLUMN IF EXISTS "lancamentoRetornoId";
