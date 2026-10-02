# Negociações do CRM

Acesse **CRM → Negociações** (`/crm/negociacoes`). Cadastre empresa, CNPJ,
data da negociação, débito original, total acordado, quantidade de parcelas
originais em aberto e modalidade à vista ou parcelada. Gere o cronograma mensal
e ajuste individualmente seus valores e vencimentos antes de salvar. Se o cronograma
estiver vazio, ele será gerado automaticamente ao salvar, usando a quantidade
e o primeiro vencimento informados. À vista gera uma parcela; parcelada exige
pelo menos duas. Cronogramas existentes são preservados ao salvar.

Em **Editar / pagamentos**, informe o total acumulado recebido em cada parcela
e a data do último pagamento. **Quitar hoje** preenche esses campos; a alteração
só é persistida ao salvar. Para corrigir um pagamento, edite os mesmos campos.
O cronograma com pagamentos não pode ser regenerado, mas permite correções
individuais. Não há lançamento automático no módulo financeiro.

- **Em aberto**: pendência ainda sem confirmação de pagamento prevista.
- **Aguardando pagamento**: pendência com vencimento combinado obrigatório.
- **Em atraso**: saldo não pago após o vencimento, no fuso America/Sao_Paulo.
- **Pago**: valor integral recebido. Pagamentos parciais reduzem o saldo.

O status geral prioriza atraso caso alguma parcela esteja vencida. A quitação
exige todas as parcelas pagas. O status é recalculado ao abrir a página e a cada
minuto enquanto ela estiver aberta.

Os filtros por mês **da negociação**, empresa/CNPJ, modalidade e status afetam
todos os indicadores. Total pago corresponde aos recebimentos acumulados dos
acordos selecionados, independentemente do mês em que ocorreram. Empresas são
contadas por CNPJ; as parcelas originais são consideradas recuperadas somente
quando o respectivo acordo está quitado. Esse número não se confunde com a
quantidade de parcelas do novo acordo já pagas, exibida separadamente na tabela.
Cada cadastro deve representar um débito distinto para evitar dupla contagem.

Valores são armazenados em centavos inteiros. Na divisão do total, centavos
residuais vão para as primeiras parcelas. Vencimentos mensais preservam o dia
original, limitando-o ao último dia do mês quando necessário.

## Banco e publicação

Aplicar a migração `20261001150000_add_negociacoes_crm` no banco de destino:

```sh
npx prisma migrate deploy
npm run build
```

A migração cria apenas a tabela `negociacoes_crm`, seu índice e vínculo com o
usuário. Não remove nem modifica registros das tabelas existentes. O comando
`npm start` do projeto também executa as migrações antes de iniciar o servidor;
plataformas que não usam esse comando precisam executar a migração na publicação.

Todas as APIs exigem sessão e filtram pelo usuário autenticado. Edição e exclusão
usam versão otimista: se outra aba alterou o registro, atualizar a lista e reabrir
a edição antes de salvar. Nenhum dado das imagens de referência foi importado.

## Verificações

```sh
node --test tests/negociacoes.test.mjs
npx tsc --noEmit
```

Os testes cobrem divisão em centavos, fim do mês/ano bissexto, atrasos,
pagamentos parciais, validação, indicadores, autenticação e controle de versão.
