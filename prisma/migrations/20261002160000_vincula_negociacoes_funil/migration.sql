ALTER TABLE "negociacoes_crm" ADD COLUMN "leadId" TEXT;
CREATE INDEX "negociacoes_crm_usuarioId_leadId_idx" ON "negociacoes_crm"("usuarioId", "leadId");
ALTER TABLE "negociacoes_crm" ADD CONSTRAINT "negociacoes_crm_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
