# Jurex — App Financeiro e de Recebíveis

Aplicativo em **Next.js 14 (App Router)** + **Prisma** + **PostgreSQL** para gestão
de empréstimos: clientes, contratos (com juros diário/semanal/quinzenal/mensal
ou valor fixo), parcelas e relatórios. O visual replica o design de referência
(cards verdes, badges de status, navegação inferior).

## Estrutura

```
app/
  page.tsx              -> Início (dashboard)
  clientes/              -> lista, novo, detalhe do cliente
  contratos/              -> lista, novo (com simulação em tempo real), detalhe
  parcelas/              -> parcelas por período (hoje/amanhã/atrasadas/por data)
  relatorios/            -> visão geral da carteira
  menu/                  -> menu secundário
  api/                    -> rotas de API (clientes, contratos, parcelas)
components/               -> BottomNav, Badge, ParcelasLista, ContratoAcoes
lib/
  calculos.ts            -> TODA a matemática financeira (juros, parcelas, status)
  prisma.ts              -> cliente Prisma singleton
prisma/
  schema.prisma          -> modelos Cliente, Contrato, Parcela
  seed.js                -> dados de exemplo opcionais
```

## Como funciona o cálculo de juros

Em `lib/calculos.ts`, função `calcularContrato`:

- **Com Juros**: `valorTotal = valorEmprestado * (1 + (jurosAoMes/100) * numeroParcelas)`
  (juros simples, proporcional ao número de parcelas)
- **Valor Fixo**: `valorTotal = valorEmprestado` (parcelado sem juros)
- **Lucro** = `valorTotal - valorEmprestado`
- As parcelas são geradas automaticamente a partir da frequência
  (diária = +1 dia, semanal = +7 dias, quinzenal = +15 dias, mensal = +1 mês)

O **status de contrato/parcela** ("em dia", "atrasado", "a vencer") é
recalculado a partir da data atual sempre que a tela é aberta — não depende
de nenhum job em segundo plano rodando no servidor.

Se quiser mudar a fórmula de juros (ex.: juros compostos), essa é a única
função que precisa mexer — todas as telas e a API usam ela.

## Rodando localmente

```bash
npm install
cp .env.example .env      # depois edite o .env com a DATABASE_URL do Railway
npx prisma migrate dev --name init
npm run db:seed            # opcional: cria clientes/contratos de exemplo
npm run dev
```

Acesse http://localhost:3000

## Publicando no Railway (passo a passo)

1. **Crie um novo projeto no Railway** (railway.app) e clique em
   "New Project" → "Deploy from GitHub repo" (suba esta pasta para um
   repositório no GitHub primeiro) — ou "Empty Project" se preferir subir
   depois com a CLI do Railway.

2. **Adicione o banco de dados**: dentro do projeto, clique em "+ New" →
   "Database" → "Add PostgreSQL". O Railway cria o serviço e já gera a
   variável `DATABASE_URL` automaticamente.

3. **Conecte a variável ao serviço do app**: no serviço do Next.js
   (o que você acabou de subir), vá em "Variables" e adicione:
   - `DATABASE_URL` → clique em "Add Reference" e selecione a
     `DATABASE_URL` do serviço PostgreSQL (assim ela fica sempre em
     sincronia, mesmo se o Railway trocar host/porta).

4. **Configure o build**: o `package.json` já tem o script de build correto:
   ```
   "build": "prisma generate && prisma migrate deploy && next build"
   ```
   Isso faz o Railway gerar o Prisma Client, aplicar as migrações no banco
   de produção e então buildar o Next.js — tudo automaticamente a cada deploy.
   Não é necessário nenhuma configuração extra no Railway além disso.

5. **Gere a primeira migração antes do primeiro deploy** (localmente, com o
   `DATABASE_URL` do Railway no seu `.env`):
   ```bash
   npx prisma migrate dev --name init
   ```
   Isso cria a pasta `prisma/migrations/`, que precisa ser commitada no
   repositório — é ela que o `prisma migrate deploy` vai aplicar no Railway.

6. **Deploy**: faça `git push` (se estiver usando o GitHub) ou
   `railway up` (se estiver usando a CLI). O Railway builda e publica
   automaticamente, e te dá uma URL pública (algo como
   `seu-app.up.railway.app`).

7. **(Opcional) Popule dados de exemplo em produção**: rode
   `railway run npm run db:seed` a partir da sua máquina, conectado ao
   projeto certo via `railway link`.

## Próximos passos sugeridos

- Autenticação (login) — hoje o app não tem controle de acesso
- Geração de PDF do contrato ("Compartilhar PDF atualizado")
- Cálculo de score de crédito automático com base no histórico de pagamentos
- Notificações automáticas (push ou WhatsApp) para parcelas próximas do vencimento
