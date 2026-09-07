-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('aberta', 'fechada', 'paga');

-- CreateTable
CREATE TABLE "cartoes_credito" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT '💳',
    "bandeira" TEXT,
    "limite" DECIMAL(12,2),
    "diaFechamento" INTEGER NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "origem" "OrigemFinanceira" NOT NULL DEFAULT 'pessoal',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "cartoes_credito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas_cartao" (
    "id" TEXT NOT NULL,
    "cartaoId" TEXT NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "dataFechamento" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusFatura" NOT NULL DEFAULT 'aberta',
    "lancamentoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faturas_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_cartao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "cartaoId" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "compras_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faturas_cartao_lancamentoId_key" ON "faturas_cartao"("lancamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_cartao_cartaoId_anoReferencia_mesReferencia_key" ON "faturas_cartao"("cartaoId", "anoReferencia", "mesReferencia");

-- AddForeignKey
ALTER TABLE "cartoes_credito" ADD CONSTRAINT "cartoes_credito_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartoes_credito" ADD CONSTRAINT "cartoes_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas_cartao" ADD CONSTRAINT "faturas_cartao_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "cartoes_credito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas_cartao" ADD CONSTRAINT "faturas_cartao_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_cartao" ADD CONSTRAINT "compras_cartao_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "cartoes_credito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_cartao" ADD CONSTRAINT "compras_cartao_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas_cartao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_cartao" ADD CONSTRAINT "compras_cartao_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_cartao" ADD CONSTRAINT "compras_cartao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
