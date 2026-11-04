Importação de empresas e reversão

O CSV agora ignora linhas cujo código ou documento normalizado já esteja no cadastro do usuário ou no próprio arquivo. Sem os dois identificadores, usa o nome normalizado. Não atualiza os dados das empresas já existentes: para valores financeiros, use Atualizar débitos.

Cada importação cria um lote persistido na tabela crm_importacoes_leads dentro da mesma transação serializável dos cadastros e das automações. O Histórico geral do CRM mostra os lotes e permite desfazer cada um. O desfazer remove somente os IDs desse lote e é idempotente. Qualquer alteração posterior, atendimento, contrato ou negociação bloqueia toda a reversão. Cadastros removidos após a importação bloqueiam a reversão do lote.

Aplicar a migração existente 20261104170000_importacoes_leads_crm e regenerar o Prisma Client antes de publicar. Lotes anteriores à migração não têm IDs rastreados: não é seguro inferir sua origem. Para revisar esses registros, Gerenciar leads oferece Mostrar possíveis duplicatas. Todas as correspondências são mostradas para conferência manual; nenhuma empresa é excluída automaticamente.

Desfazer atualização de débitos continua restrito aos quatro campos financeiros e não exclui cadastros de empresas.
