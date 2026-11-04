CREATE TABLE "crm_importacoes_leads" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "arquivo" TEXT NOT NULL,
  "registros" JSONB NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "desfeitoEm" TIMESTAMP(3),
  CONSTRAINT "crm_importacoes_leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_importacoes_leads_usuarioId_criadoEm_idx" ON "crm_importacoes_leads"("usuarioId", "criadoEm");
ALTER TABLE "crm_importacoes_leads" ADD CONSTRAINT "crm_importacoes_leads_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
