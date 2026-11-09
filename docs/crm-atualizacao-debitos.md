# Atualização de débitos por Excel

No CRM, use **Atualizar débitos**. A importação antiga de novos leads continua separada.

1. Selecione a planilha `.xlsx` e os grupos que pertencem à carteira do arquivo.
2. Confirme que a listagem de débitos em aberto está completa para esses grupos.
3. Clique em **Analisar planilha**. A análise salva uma prévia, sem alterar leads.
4. Confira as correspondências (antes/depois), ausentes e pendências de identificação.
5. Confira também as duplicatas indicadas em Conferência e o cadastro/etapa que será mantido.
   Confirme para substituir valor em aberto e quantidade de parcelas pelos totais da planilha.
   Vencimentos omitidos no resumo preservam as datas existentes.
6. Na aba de ausentes, exporte a lista ou abra o cadastro para verificar negociação,
   quitação, reposicionamento ou exclusão pelos controles já existentes do CRM.

Ausência não é quitação. Empresas ausentes não são removidas, movimentadas ou zeradas.
A atualização não cria empresas novas. Duplicatas identificadas na prévia são removidas
após transferência dos vínculos ao cadastro mantido. Os filtros visuais do quadro não limitam a análise; o escopo são
os grupos selecionados no modal, sempre da conta autenticada.

## Modelo do arquivo

No modal, abra **Ver exemplo das colunas do Excel**. Os exemplos de Detalhe e
Resumo podem ser selecionados e copiados diretamente para a célula A1 do Excel.
Formate código e documento como Texto antes de colar e substitua os dados fictícios.

- Detalhes: `Cod`, `Razão Social`, `CNPJ/CPF`, `Dt Venc.`, `Vr. Doc.`.
- Resumo: `Cod`, `Razão Social`, `CNPJ/CPF`, `Qtd. Parcelas`,
  `Valor Total em Aberto`; `Venc. Mais Antigo` e `Venc. Mais Recente` são opcionais.
  Basta um dos identificadores: Código ou CNPJ/CPF, junto à razão social.
- Quando há uma aba de detalhes reconhecida, ela tem prioridade sobre o resumo.
  O sistema soma os valores em centavos e conta as linhas de parcelas por empresa.
- Fórmulas no resumo exigem resultado salvo pelo Excel; o servidor não calcula fórmulas.
- Datas brasileiras, datas nativas do Excel e datas ISO são aceitas.
- CNPJ/CPF deve preservar os zeros iniciais. Valores negativos, datas inválidas,
  parcelas detalhadas idênticas e código associado a identidades diferentes bloqueiam a análise.
- Resumos repetidos da mesma identidade, com saldos, parcelas e datas iguais, contam
  apenas uma vez. Totais divergentes bloqueiam a análise: forneça o saldo consolidado,
  sem somar linhas repetidas. O valor importado substitui o saldo anterior do CRM.
- Detalhes contendo pagamento/baixa são recusados para não tratar valor original
  como saldo remanescente. Nesse caso exporte somente parcelas integralmente em
  aberto ou um resumo com o saldo efetivo.
- Máximo de 10 MB, 20.000 linhas por aba utilizada e 100 colunas.

Código e documento são comparados normalizados. Razão social é comparada por
igualdade, desconsiderando acentos, caixa e espaços repetidos, quando não existe
correspondência por identificador. Identificadores divergentes ou cadastros
ambíguos ficam em pendências. Duplicatas com identificação forte compatível e
na mesma etapa são unificadas no cadastro atualizado mais recentemente (desempate por ID).
Duplicatas em etapas diferentes ou identificadas apenas por nome exigem revisão: abra
os cadastros, confirme a identidade e mantenha a etapa correta antes de analisar novamente.
Atendimentos e anexos, negociações, contratos e histórico passam para o cadastro mantido.
Os campos próprios desse cadastro e sua etapa não são substituídos pelos das duplicatas;
o cadastro completo de cada duplicata fica salvo no backup da importação. Candidatos ambíguos não entram na lista de ausentes.

## Histórico e concorrência

As últimas 20 análises ficam acessíveis no modal, com os relatórios completos e
valores anteriores. As prévias expiram para aplicação após 24 horas. Se um cadastro
ou o conjunto de empresas do escopo mudar desde a prévia, é necessário analisar
novamente. A aplicação é atômica, em transação serializável, e reenvios não reaplicam
o lote. A reversão restaura os débitos, recria os cadastros duplicados com os IDs originais e
devolve seus vínculos. Ela é bloqueada caso o cadastro mantido ou algum vínculo
transferido tenha sido alterado ou removido depois da aplicação. Tudo ocorre na
mesma transação: falha não deixa uma restauração parcial. Importações antigas, sem
backup de unificação, continuam restaurando apenas os campos de débito. Ausentes são fotografias do momento
da prévia, não uma lista atualizada em tempo real.

## Publicação e validação

A migração `20261006130000_importacoes_debitos_crm` adiciona apenas a tabela de
histórico e a relação com usuário. Execute `prisma migrate deploy` antes de usar as
rotas novas em produção; o comando `npm start` do projeto já inclui essa etapa.
Depois, publique o código no ambiente que atende `meumoney.online`.

Validações locais:

```
npx prisma generate
npx tsc --noEmit
node --test --test-isolation=none tests/*.test.mjs
npm run build
```

O teste automatizado de transação usa um banco simulado com rollback; não substitui
um teste de integração em PostgreSQL. A planilha fornecida foi analisada localmente:
616 empresas, 2.387 parcelas e R$ 296.907,09, conferindo com o rodapé do arquivo.
Nenhum dado dessa planilha é incluído nos testes ou versionado no repositório.

Resultado desta execução: 67 testes passaram (14 novos), TypeScript e lint dos
arquivos alterados passaram. O build de produção foi interrompido no download da
fonte Inter via `next/font`, indisponível na rede do ambiente. Não houve publicação
nem alteração no banco de produção; a autenticação GitHub disponível não foi aceita.


### Recuperar os valores anteriores com alterações posteriores

Desfazer compara os quatro campos de débito com o resultado importado. Editar nome,
telefone ou grupo não impede desfazer quando os débitos continuam iguais.

Quando os próprios débitos foram alterados depois, o histórico oferece
**Restaurar valores anteriores quando o desfazer estiver bloqueado**. A conferência
mostra os valores atuais e os anteriores à planilha. Confirmar substitui somente
valor em aberto, quantidade de parcelas e as duas datas de vencimento, preservando
os demais dados. Os valores substituídos ficam em `relatorio.restauracao.backup`,
na mesma transação da restauração e dos registros de histórico. A confirmação
contém um token do estado conferido e recusa alterações concorrentes. Se houver
empresa removida, a restauração é bloqueada sem alterar parcialmente o lote.
Este recurso restaura débitos de IDs registrados; não exclui empresas duplicadas
criadas por outra importação e não substitui um backup completo do sistema.

## Validação da melhoria de unificação

- 19 testes de débitos passaram, incluindo resumo mínimo, totais repetidos,
  conflito de etapa, transferência de vínculos e reversão integral/atômica.
- TypeScript passou; lint dos arquivos alterados sem erros (avisos de complexidade).
- Suíte completa: 111 de 112 testes passaram. O teste de estorno em
  `contratos-negociacoes.test.mjs` espera `em_dia` para vencimento que já passou.
- Build bloqueado pelo download da fonte Inter em Google Fonts.
- Testes de transação usam banco simulado; integração real com PostgreSQL ainda
  precisa ser validada antes da publicação. Nenhum dado de produção foi alterado.
- Não há migração nova: backups usam o JSON do histórico de importações existente.
