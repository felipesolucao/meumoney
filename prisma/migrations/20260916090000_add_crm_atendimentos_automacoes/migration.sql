-- AlterTable
ALTER TABLE "crm_leads" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "valorPago" DECIMAL(12,2),
ADD COLUMN     "parcelaMaisAntiga" TIMESTAMP(3),
ADD COLUMN     "parcelaMaisRecente" TIMESTAMP(3),
ADD COLUMN     "dataUltimoContato" TIMESTAMP(3),
ADD COLUMN     "statusPlanilha" TEXT,
ADD COLUMN     "progresso" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "crm_atendimentos" (
    "id" TEXT NOT NULL,
    "observacao" TEXT NOT NULL,
    "tentativaNumero" INTEGER,
    "dataTratativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "crm_atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_automacoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "statusPlanilha" TEXT,
    "progressoMin" INTEGER,
    "progressoMax" INTEGER,
    "estagioDestino" "EstagioLeadCrm" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "crm_automacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_atendimentos_leadId_dataTratativa_idx" ON "crm_atendimentos"("leadId", "dataTratativa");

-- CreateIndex
CREATE INDEX "crm_automacoes_usuarioId_ordem_idx" ON "crm_automacoes"("usuarioId", "ordem");

-- AddForeignKey
ALTER TABLE "crm_atendimentos" ADD CONSTRAINT "crm_atendimentos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_atendimentos" ADD CONSTRAINT "crm_atendimentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_automacoes" ADD CONSTRAINT "crm_automacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
