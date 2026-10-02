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

O filtro **Mês dos recebíveis** abre no mês atual e seleciona somente parcelas
com vencimento nesse mês, inclusive de acordos criados antes dele. Empresa/CNPJ,
modalidade e status refinam esse recorte. Totais e status consideram apenas as
parcelas do mês. Total pago corresponde aos recebimentos acumulados dessas
parcelas, independentemente da data em que foram pagos. Empresas são
contadas por CNPJ. O indicador de parcelas conta apenas as parcelas do mês;
a tabela preserva a numeração original de cada parcela no acordo.
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

## Empresas e funil

No campo **Empresa**, digite pelo menos dois caracteres do nome ou CNPJ e
selecione um resultado (mouse ou setas + Enter). A busca ignora acentos no nome
e a máscara do CNPJ. A seleção vincula o acordo ao cadastro e preenche nome,
CNPJ, débito e parcelas originais em aberto. Todos esses valores continuam
editáveis para acrescentar encargos, ajustar parcelas ou conceder descontos.
O total negociado é sugerido quando ainda não existe cronograma; cronogramas
e pagamentos existentes são preservados. Esses ajustes não sobrescrevem os
valores importados no cadastro da empresa.

Ao salvar, o acordo e a etapa do funil são atualizados na mesma transação:

- Acordos com saldo, inclusive parciais e atrasados: **Aguardando pagamento**.
- Todos os acordos vinculados à empresa quitados: **Negociado**.
- Correção de pagamento que reabre saldo: **Aguardando pagamento** novamente.
- Remover o último vínculo ou excluir o último acordo: volta para
  **Em negociação**, se estava em uma das etapas geridas pela integração.

A movimentação fica registrada no histórico de atendimentos. Com vários
acordos para a mesma empresa, quitar apenas um não conclui o funil.
Ao trocar a empresa vinculada, os dois cadastros têm sua etapa recalculada.
Negociações antigas e cadastros manuais continuam sem vínculo até selecionar
uma empresa na busca; não há associação automática por nomes parecidos ou
CNPJs duplicados. Excluir uma empresa preserva o acordo, removendo seu vínculo.

A migração `20261002160000_vincula_negociacoes_funil` adiciona a referência
opcional à empresa e seu índice, sem alterar os acordos existentes. Aplique-a
com `prisma migrate deploy` (incluído em `npm start`) antes de servir a versão.

Validação adicional: `node --test tests/negociacoes-funil.test.mjs` cobre busca,
preenchimento editável, movimentações, múltiplos acordos, remoção de vínculos,
controle de versão, isolamento de usuários e rollback em falha.

## Relatório Excel

Clique em **Exportar Excel** para baixar um arquivo `.xlsx` com as negociações
visíveis após os filtros por empresa/CNPJ, mês de vencimento, tipo e status.
A exportação usa os dados já salvos; alterações abertas no formulário precisam
ser salvas antes. O botão fica indisponível enquanto carrega ou sem resultados.

A aba **Negociações** segue o modelo de 12 colunas: Ordem, Situação, Empresa,
CNPJ, Parcelas em atraso, Data negociação, Débito, Negociação, Status,
Data pgto, Valor pago e Obs. Há uma linha por parcela, numerada `1/3`, `2/3`
etc. Status e cores são da parcela: verde para pago, azul para aguardando,
vermelho para atrasada e branco para em aberto. O valor pago é o efetivamente
recebido; a data é a do último pagamento registrado. Datas e moedas são células
nativas do Excel; CNPJ e numeração da parcela são texto. Cabeçalho congelado,
filtros e impressão horizontal estão configurados.

Situação identifica negociações anteriores ou dentro do mês de referência
(mês de vencimento selecionado no filtro). O filtro mensal usa o vencimento
das parcelas, não a data de criação da negociação. “Parcelas em atraso”
corresponde às parcelas originais em aberto informadas no acordo.

A aba **Resumo dos acordos** registra os filtros, valor das parcelas do mês, total pago dessas parcelas,
saldo e próximo vencimento dentro do mês, por acordo. Os totais contam cada acordo uma vez:
o débito original se repete nas linhas de parcelas da primeira aba e não deve
ser somado ali. O arquivo não altera dados no CRM.

Testes do relatório: `node --test tests/negociacoes-excel.test.mjs`.


## Consulta mensal de recebíveis

O mês nunca fica sem seleção: limpar o campo ou clicar em **Limpar filtros**
retorna ao mês atual no fuso de São Paulo. Parcelas anteriores, futuras ou sem
vencimento não entram nos indicadores, na lista ou no Excel do mês escolhido.
A numeração original é preservada (por exemplo, `2/6`). A edição abre o acordo
completo para preservar seus pagamentos e parcelas de outros meses; a consulta
mensal não modifica o cadastro. O status filtrado é o das parcelas do mês.

Validação: `node --test tests/negociacoes-periodo.test.mjs tests/negociacoes-excel.test.mjs`.
