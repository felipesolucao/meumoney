-- CreateEnum
CREATE TYPE "SituacaoCliente" AS ENUM ('ativo', 'inadimplente', 'inativo');

-- CreateEnum
CREATE TYPE "EntidadeHistorico" AS ENUM ('Contrato', 'Parcela', 'Cliente', 'Lancamento');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "situacao" "SituacaoCliente" NOT NULL DEFAULT 'ativo',
ADD COLUMN     "telefone2" TEXT,
ADD COLUMN     "uf" TEXT;

-- CreateTable
CREATE TABLE "historico_acoes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidade" "EntidadeHistorico" NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2),
    "revertidoEm" TIMESTAMP(3),
    "revertidoPor" TEXT,
    "origemId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "historico_acoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_acoes_usuarioId_entidade_criadoEm_idx" ON "historico_acoes"("usuarioId", "entidade", "criadoEm");

-- AddForeignKey
ALTER TABLE "historico_acoes" ADD CONSTRAINT "historico_acoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
