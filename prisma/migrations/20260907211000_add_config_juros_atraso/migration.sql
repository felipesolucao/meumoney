ALTER TABLE "contratos"
  ADD COLUMN "tipoJurosAtraso" TEXT,
  ADD COLUMN "valorJurosAtraso" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "frequenciaJurosAtraso" TEXT;
