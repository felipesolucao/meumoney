CREATE TABLE "crm_historico" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "alteracoes" JSONB NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_historico_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_historico_leadId_criadoEm_id_idx" ON "crm_historico"("leadId", "criadoEm", "id");
ALTER TABLE "crm_historico" ADD CONSTRAINT "crm_historico_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
