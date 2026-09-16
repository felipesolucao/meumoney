-- AlterTable
ALTER TABLE "crm_atendimentos" ADD COLUMN     "arquivoNome" TEXT,
ADD COLUMN     "arquivoTipo" TEXT,
ADD COLUMN     "arquivoTamanho" INTEGER,
ADD COLUMN     "arquivoDados" BYTEA;

-- CreateTable
CREATE TABLE "crm_estagios_config" (
    "id" TEXT NOT NULL,
    "estagio" "EstagioLeadCrm" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "nomePersonalizado" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "crm_estagios_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_estagios_config_usuarioId_estagio_key" ON "crm_estagios_config"("usuarioId", "estagio");

-- AddForeignKey
ALTER TABLE "crm_estagios_config" ADD CONSTRAINT "crm_estagios_config_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
