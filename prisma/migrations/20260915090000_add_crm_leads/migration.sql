-- CreateEnum
CREATE TYPE "EstagioLeadCrm" AS ENUM ('primeira_tentativa', 'segunda_tentativa', 'email_cobranca', 'em_negociacao', 'sem_resposta', 'sem_contato', 'a_cancelar', 'cancelado', 'negociacao_ok', 'negociado', 'aguardando_pagamento');

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "estagio" "EstagioLeadCrm" NOT NULL DEFAULT 'primeira_tentativa',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "valorEmAberto" DECIMAL(12,2),
    "quantidadeParcelas" INTEGER,
    "quantidadeColaboradores" INTEGER,
    "cnpj" TEXT,
    "telefone" TEXT,
    "telefone2" TEXT,
    "email" TEXT,
    "sindicatoPatronal" TEXT,
    "origem" TEXT,
    "observacoes" TEXT,
    "camposExtras" JSONB,
    "movimentadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_leads_usuarioId_estagio_ordem_idx" ON "crm_leads"("usuarioId", "estagio", "ordem");

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
