-- CreateEnum
CREATE TYPE "ScoreCliente" AS ENUM ('baixo', 'medio', 'alto');

-- CreateEnum
CREATE TYPE "TipoEmprestimo" AS ENUM ('fixo', 'juros');

-- CreateEnum
CREATE TYPE "Frequencia" AS ENUM ('diaria', 'semanal', 'quinzenal', 'mensal');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('em_dia', 'atrasado', 'quitado');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('a_vencer', 'atrasado', 'pago');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "cpf" TEXT,
    "score" "ScoreCliente" NOT NULL DEFAULT 'medio',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorEmprestado" DECIMAL(12,2) NOT NULL,
    "tipoEmprestimo" "TipoEmprestimo" NOT NULL,
    "jurosAoMes" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "jurosAtraso" BOOLEAN NOT NULL DEFAULT false,
    "numeroParcelas" INTEGER NOT NULL,
    "frequencia" "Frequencia" NOT NULL,
    "dataPrimeiraParcela" TIMESTAMP(3) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "valorLucro" DECIMAL(12,2) NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'em_dia',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusParcela" NOT NULL DEFAULT 'a_vencer',
    "pagoEm" TIMESTAMP(3),
    "valorPago" DECIMAL(12,2),

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_codigo_key" ON "contratos"("codigo");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
