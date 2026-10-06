# Histórico e movimentação de empresas

O botão **Histórico geral** no topo do CRM abre um popup com os eventos de todas as empresas da conta, em ordem decrescente de data. Cada evento identifica a empresa e permite abrir seu perfil. A listagem carrega 50 registros por vez e oferece “Carregar mais” para consultar os anteriores.

O painel da empresa inclui “Movimentações e edições”, com data/hora, responsável e valores anteriores e novos. O registro acompanha edições de cadastro, mudanças de grupo manuais/automáticas, atendimentos (inclusão, edição e exclusão), conclusão de alertas, importação/reversão de débitos e movimentações por negociação. Os logs de atendimentos permanecem mesmo após a exclusão do atendimento; não incluem o conteúdo binário dos anexos.

Alterações efetivas reiniciam `movimentadoEm` na data da operação, inclusive quando um atendimento tem data retroativa. Salvar dados idênticos ou apenas reordenar cards na mesma coluna não reinicia a contagem. Os indicadores e cards usam a mesma regra: mais de sete períodos de 24 horas desde a última atividade. O totalizador mantém a exclusão dos estágios encerrados.

O formulário envia somente os campos editados. Assim, salvar o cadastro depois de adicionar um atendimento não sobrescreve a data de último contato atualizada pelo atendimento. O quadro é recarregado após as ações do histórico mesmo com o painel aberto.

## Banco e publicação

Aplicar `npx prisma migrate deploy` e gerar o cliente com `npx prisma generate` antes de disponibilizar a versão. A migração `20261006190000_crm_historico` adiciona uma tabela e um índice, sem alterar os cadastros existentes ou suas datas de movimentação. Os scripts existentes de build/start já executam essas etapas.

O histórico começa na implantação; eventos anteriores não podem ser reconstruídos. Os registros acompanham a empresa e são removidos se a própria empresa for excluída. A API de leitura exige sessão e propriedade da empresa, oferece páginas de 50 eventos e não expõe edição ou exclusão de logs.

## Validação

`node --test tests/*.test.mjs` e `npx tsc --noEmit`. Os testes de histórico cobrem o contador, o limite de sete dias, edições sem mudanças, grupo de origem/destino, atendimento retroativo, exclusão preservando auditoria, controle de acesso e rollback quando o log falha. As transações são simuladas nesses testes; validar a migração também no PostgreSQL de homologação antes da publicação.
