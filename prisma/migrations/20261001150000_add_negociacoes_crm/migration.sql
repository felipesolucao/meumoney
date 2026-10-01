CREATE TABLE "negociacoes_crm" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "empresa" TEXT NOT NULL,
  "cnpj" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "dataNegociacao" TEXT NOT NULL,
  "debitoCentavos" INTEGER NOT NULL,
  "totalCentavos" INTEGER NOT NULL,
  "parcelasOriginais" INTEGER NOT NULL,
  "observacoes" TEXT NOT NULL DEFAULT '',
  "parcelas" JSONB NOT NULL,
  "versao" INTEGER NOT NULL DEFAULT 1,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "negociacoes_crm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "negociacoes_crm_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "negociacoes_crm_usuarioId_dataNegociacao_idx" ON "negociacoes_crm"("usuarioId", "dataNegociacao");
