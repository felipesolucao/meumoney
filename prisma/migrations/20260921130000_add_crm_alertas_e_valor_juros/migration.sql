-- AlterTable
ALTER TABLE "crm_leads" ADD COLUMN "valorTotalComJuros" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "crm_atendimentos" ADD COLUMN "alertaEm" TIMESTAMP(3),
ADD COLUMN "alertaConcluidoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "crm_atendimentos_usuarioId_alertaConcluidoEm_alertaEm_idx"
ON "crm_atendimentos"("usuarioId", "alertaConcluidoEm", "alertaEm");
