CREATE TABLE "modelos_cobranca" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "modelos_cobranca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "modelos_cobranca_usuarioId_tipo_key" ON "modelos_cobranca"("usuarioId", "tipo");

ALTER TABLE "modelos_cobranca" ADD CONSTRAINT "modelos_cobranca_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
