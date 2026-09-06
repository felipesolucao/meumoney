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

## Módulo de Controle Financeiro (`/financeiro`)

Separado do módulo de empréstimos (Contratos/Parcelas), esse módulo cobre o
financeiro do dia a dia — pessoal ou da empresa:

- **Lançamento** = uma receita ou despesa (um "cartão" na lista de contas a
  pagar/receber). Tem descrição, valor, categoria, conta/carteira, status
  (pendente/pago) e data de vencimento.
- **LancamentoRecorrente** = a "regra" por trás de uma conta fixa ou
  parcelada. Ao criar um lançamento marcado como recorrente, o app gera os
  `Lancamento`s automaticamente, exatamente como um Contrato gera Parcelas.
  A recorrência pode terminar de 3 formas (campo `tipoFim`):
  - `sem_fim` — conta fixa contínua (ex: salário, aluguel). Gera um lote de
    12 ocorrências por vez (`HORIZONTE_SEM_FIM` em `lib/financeiro.ts`).
  - `data_fim` — repete até uma data escolhida.
  - `parcelas` — repete um número exato de vezes (ex: financiamento em 12x).
- **Categoria** e **Conta** são cadastros simples (nome + ícone), criados
  direto no formulário de novo lançamento com o botão "+".
- Excluir um lançamento que pertence a uma recorrência pergunta se é para
  excluir só aquela ocorrência ou a série inteira.

### Aplicando esta atualização

Se o projeto já estava rodando antes desse módulo existir, gere a migração
do banco antes de subir para o Railway:

```bash
npx prisma migrate dev --name modulo_financeiro
```

Isso cria as tabelas novas (`lancamentos`, `lancamentos_recorrentes`,
`categorias`, `contas`) sem apagar nada que já existia.

## Redesign visual (ícones, sombras, saldo oculto)

Todo o app foi atualizado para um visual mais "clean":

- **`components/Icons.tsx`** — biblioteca de ícones em SVG (traço, sem
  preenchimento) que substitui TODOS os emojis usados como ícone de
  interface (botão de voltar, sino, lixeira, cadeado de saldo etc.). Emojis
  que são *dados do usuário* (o ícone de uma categoria como "🎁 Bonificação")
  continuam emoji de propósito — são conteúdo, não parte do design do app.
- **`components/CardSaldo.tsx`** — o card grande de saldo (Início e
  Financeiro) ganhou um padrão decorativo de linhas onduladas no fundo e um
  ícone de olho que oculta o valor (mostra "R$ ••••••") — útil pra não expor
  o saldo com alguém do lado.
- **`components/BotaoVoltar.tsx`** — botão de voltar padronizado, reutilizado
  em todas as telas que tinham esse botão duplicado antes.
- **`app/globals.css`** — sombras mais suaves e em camadas (`.card`,
  `.quick-tile`, `.icon-btn`), pra dar mais profundidade sem pesar o visual.

## Login e contas de usuário

Cada pessoa que usa o app agora tem sua própria conta, e só enxerga os
próprios clientes, contratos, parcelas, categorias, contas e lançamentos —
o Prisma filtra tudo por `usuarioId` em todas as rotas de API e em todas as
páginas que buscam dados diretamente do banco.

- **Cadastro** (`/cadastro`) exige e-mail, senha de **exatamente 6 números**
  (tipo um PIN) e telefone (WhatsApp). Toda conta criada por aqui nasce com
  papel `usuario` — nunca `admin`.
- **Login** (`/login`) bloqueia por 5 minutos depois de 5 tentativas erradas
  seguidas com o mesmo e-mail (proteção simples contra tentar todos os PINs
  possíveis, já que 6 dígitos numéricos são só 1 milhão de combinações).
- **Sessão**: um cookie `httpOnly` guarda um token assinado (JWT) por 30
  dias — não tem "banco de sessões", é tudo verificado a partir da
  assinatura do token (`lib/auth.ts`). **Defina a variável de ambiente
  `JWT_SECRET`** no Railway e no seu `.env` local com um valor longo e
  aleatório (ex: gere um com `openssl rand -base64 32` ou peça pra mim gerar
  um) — sem isso, o app usa uma chave padrão insegura, ok só pra testar
  localmente.
- **`middleware.ts`** bloqueia o acesso a qualquer tela sem login (exceto
  `/login` e `/cadastro`) redirecionando pra `/login`. As rotas de API se
  protegem sozinhas (retornam erro 401 em JSON, em vez de redirecionar).

### Conta de administrador

Não existe cadastro público de admin (por segurança). Pra criar a sua conta
de administrador em produção, rode uma vez, com o `DATABASE_URL` do Railway
configurado (localmente no `.env`, ou via `railway run` direto no projeto):

```bash
node scripts/criar-admin.js seuemail@exemplo.com 123456 62999999999
```

Troque `123456` por uma senha de 6 dígitos à sua escolha, e o telefone pelo
seu WhatsApp. Se o e-mail já existir (por exemplo, você já criou a conta
pela tela de cadastro normal), o script só promove essa conta pra admin,
sem mexer na senha.

O admin acessa `/admin` (tem um atalho no Menu) e vê **apenas**: quantas
contas existem na plataforma, a lista de e-mails/telefones/data de cadastro,
e quantos clientes/lançamentos cada uma tem — **não** vê o conteúdo
financeiro de ninguém (nomes de clientes, valores de contratos etc.).

### Aplicando esta atualização (⚠️ apaga os dados atuais do banco)

Como as tabelas que já existiam (`clientes`, `contratos`, `categorias`,
`contas`, `lancamentos`, `lancamentos_recorrentes`) ganharam uma coluna
`usuarioId` **obrigatória**, não dá pra rodar uma migração normal em cima de
dados que já existem sem dono — o Prisma não sabe pra qual usuário atribuir
os registros antigos. Se os dados atuais do seu banco são só de teste (como
parece ser o caso), o caminho mais simples é resetar:

```bash
npx prisma migrate reset
```

Isso apaga todo o conteúdo do banco, aplica todas as migrações do zero
(incluindo essa) e roda o `db:seed` de novo automaticamente — que já cria a
conta de admin (`admin@jurex.com` / senha `123456`) e uma conta de teste
(`teste@jurex.com` / senha `123456`) com alguns clientes e lançamentos de
exemplo. **Troque a senha do admin depois com o script acima.**

Se você tiver dados reais no banco de produção que não pode perder, me avise
antes de rodar isso — nesse caso o certo é escrever uma migração manual que
cria um "usuário dono" e atribui todos os registros antigos a ele, em vez de
resetar.
