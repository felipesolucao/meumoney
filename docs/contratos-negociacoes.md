# Contratos, negociações e funil

Os contratos aparecem na listagem e nos relatórios de Negociações, identificados pelo código do contrato. A ação **Pagar parcelas** abre as parcelas reais e permite receber valores, escolher a conta de destino, registrar pagamentos parciais e estornar. **Abrir contrato** leva ao cadastro original. O filtro mensal existente continua valendo para contratos e acordos.

A listagem projeta `Contrato` e `Parcela` no formato dos recebíveis. Não cria uma cópia em `NegociacaoCrm`, nem uma receita financeira adicional. As duas telas utilizam `/api/parcelas/[id]`; pagamento, estado do contrato, funil e histórico são gravados na mesma transação serializável. A listagem é atualizada após a operação e ao voltar à aba de Negociações.

`Contrato.leadId` identifica a empresa no funil. Contratos do mesmo cliente reutilizam o vínculo. O primeiro contrato busca um CNPJ inequívoco, normalizado e pertencente ao mesmo usuário. Sem correspondência segura, cria um lead com origem **Contratos**. Não há associação pelo nome. Cadastros sem CPF/CNPJ continuam podendo receber pagamentos.

O estágio passa para **Negociado** somente quando todos os contratos e acordos vinculados têm todas as parcelas pagas. Pagamentos parciais e estornos mantêm ou retornam o estágio para **Aguardando pagamento**. Os valores dos leads gerados com origem **Contratos** refletem suas parcelas; dados importados de outros leads são preservados.

Acordos manuais preexistentes continuam independentes. Um mesmo CNPJ identifica a empresa, mas não prova que um acordo manual é uma cópia de determinado contrato; esses registros não são fundidos nem excluídos automaticamente.

## Implantação

Aplicar a migração `20261008190000_contratos_funil` antes de executar esta versão da aplicação, usando o fluxo de implantação existente (`prisma migrate deploy`). Ela cria a relação e inclui os contratos existentes no funil, sem alterar seus pagamentos ou criar negociações duplicadas. O script `npm start` do projeto já executa as migrações pendentes. Ambientes que não usam esse script precisam executar a migração explicitamente.

Esta alteração foi validada localmente. Nenhuma migração foi executada no banco de produção.

## Validação

- `node --test tests/*.test.mjs`: suíte completa aprovada.
- `npx tsc --noEmit`: aprovado.
- ESLint dos arquivos alterados: sem erros, com avisos de complexidade/tamanho.
- Migrações executadas em PostgreSQL isolado via PGlite, incluindo dados de contratos existentes, múltiplos contratos, usuários distintos, parciais, quitação legada, acordo pendente e exclusão do lead.
- O build de produção depende do download da fonte Inter do Google Fonts; esse acesso não está disponível neste ambiente.
