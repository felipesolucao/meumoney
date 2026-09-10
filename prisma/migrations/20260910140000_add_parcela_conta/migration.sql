-- AlterTable
ALTER TABLE "parcelas" ADD COLUMN "contaId" TEXT;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
