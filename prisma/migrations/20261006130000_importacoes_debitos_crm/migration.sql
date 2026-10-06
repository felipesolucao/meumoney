CREATE TABLE "crm_importacoes_debitos" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "arquivo" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "relatorio" JSONB NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aplicadoEm" TIMESTAMP(3),
  "desfeitoEm" TIMESTAMP(3),
  CONSTRAINT "crm_importacoes_debitos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_importacoes_debitos_usuarioId_criadoEm_idx" ON "crm_importacoes_debitos"("usuarioId", "criadoEm");
ALTER TABLE "crm_importacoes_debitos" ADD CONSTRAINT "crm_importacoes_debitos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
