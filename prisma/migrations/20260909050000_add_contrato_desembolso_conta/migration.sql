-- AlterTable
ALTER TABLE "contratos" ADD COLUMN "contaDesembolsoId" TEXT,
  ADD COLUMN "lancamentoDesembolsoId" TEXT;

-- AlterTable
ALTER TABLE "parcelas" ADD COLUMN "lancamentoRetornoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contratos_lancamentoDesembolsoId_key" ON "contratos"("lancamentoDesembolsoId");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_lancamentoRetornoId_key" ON "parcelas"("lancamentoRetornoId");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_contaDesembolsoId_fkey" FOREIGN KEY ("contaDesembolsoId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_lancamentoDesembolsoId_fkey" FOREIGN KEY ("lancamentoDesembolsoId") REFERENCES "lancamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_lancamentoRetornoId_fkey" FOREIGN KEY ("lancamentoRetornoId") REFERENCES "lancamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
