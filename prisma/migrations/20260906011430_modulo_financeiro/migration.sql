-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('receita', 'despesa');

-- CreateEnum
CREATE TYPE "OrigemFinanceira" AS ENUM ('pessoal', 'empresarial');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('pendente', 'pago');

-- CreateEnum
CREATE TYPE "TipoFimRecorrencia" AS ENUM ('sem_fim', 'data_fim', 'parcelas');

-- CreateEnum
CREATE TYPE "PeriodicidadeLancamento" AS ENUM ('diaria', 'semanal', 'quinzenal', 'mensal', 'anual');

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "icone" TEXT NOT NULL DEFAULT '💰',
    "cor" TEXT NOT NULL DEFAULT '#2FA85A',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT '🏦',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_recorrentes" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "origem" "OrigemFinanceira" NOT NULL DEFAULT 'pessoal',
    "categoriaId" TEXT,
    "contaId" TEXT,
    "periodicidade" "PeriodicidadeLancamento" NOT NULL,
    "tipoFim" "TipoFimRecorrencia" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "numeroParcelas" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_recorrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "origem" "OrigemFinanceira" NOT NULL DEFAULT 'pessoal',
    "status" "StatusLancamento" NOT NULL DEFAULT 'pendente',
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "valorPago" DECIMAL(12,2),
    "categoriaId" TEXT,
    "contaId" TEXT,
    "recorrenteId" TEXT,
    "numeroParcela" INTEGER,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lancamentos_recorrentes" ADD CONSTRAINT "lancamentos_recorrentes_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_recorrentes" ADD CONSTRAINT "lancamentos_recorrentes_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_recorrenteId_fkey" FOREIGN KEY ("recorrenteId") REFERENCES "lancamentos_recorrentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
