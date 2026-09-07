CREATE TABLE "carteiras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "carteiras_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contas" ADD COLUMN "carteiraId" TEXT;

CREATE UNIQUE INDEX "carteiras_usuarioId_nome_key" ON "carteiras"("usuarioId", "nome");

ALTER TABLE "carteiras" ADD CONSTRAINT "carteiras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contas" ADD CONSTRAINT "contas_carteiraId_fkey" FOREIGN KEY ("carteiraId") REFERENCES "carteiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
