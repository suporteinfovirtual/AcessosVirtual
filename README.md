# Painel interno — base do backend

O que já está pronto nesta primeira etapa:

- `schema.sql` — as três tabelas: `clientes`, `acessos` (anydesk / acesso_web / acesso_zeta,
  ligado a um cliente) e `contas_internas` (e-mails e serviços da própria empresa).
- `functions/api/_middleware.ts` — protege todas as rotas `/api/*` exigindo a sessão válida,
  exceto `/api/login`.
- `functions/api/login.ts` — recebe a senha única, confere com o segredo configurado e,
  se estiver certa, grava um cookie de sessão assinado (dura 30 dias).
- `functions/api/clientes/index.ts` — `GET` lista clientes (com filtro `?busca=`) já trazendo
  os acessos de cada um; `POST` cria um cliente novo (pode já vir com os acessos juntos).
- `functions/api/clientes/[id].ts` — `GET` um cliente específico, `PUT` atualiza, `DELETE` remove.
- `functions/api/clientes/[id]/acessos.ts` — `POST` adiciona um novo acesso a um cliente existente.
- `functions/api/acessos/[id].ts` — `PUT`/`DELETE` de um acesso específico.
- `functions/api/internos.ts` — `GET`/`POST` das contas internas da empresa.

- `frontend/` — o site em Angular (standalone components + Tailwind CSS v4) que consome essa
  API: tela de login por senha única, busca por nome/CNPJ, as três categorias de acesso
  (AnyDesk, Acesso Web, Acesso Zeta), formulário de cliente com os acessos, e uma área
  discreta pras contas internas da empresa. Falta só colocar o logo real em
  `frontend/public/logo.png`.

## Como colocar isso no ar (tudo gratuito)

1. **Crie uma conta gratuita na Cloudflare**, se ainda não tiver: https://dash.cloudflare.com/sign-up

2. **Instale o Wrangler** (a ferramenta de linha de comando da Cloudflare) e faça login:
   ```
   npm install -g wrangler
   wrangler login
   ```

3. **Crie o banco de dados D1:**
   ```
   wrangler d1 create painel-clientes-db
   ```
   O comando devolve um `database_id`. Copie esse valor e cole no `wrangler.toml`, no
   lugar de `SUBSTITUIR_PELO_ID_RETORNADO_NO_PASSO_2`.

4. **Aplique o schema no banco recém-criado:**
   ```
   wrangler d1 execute painel-clientes-db --remote --file=./schema.sql
   ```
   Se o banco já existia antes desta versão, rode também as migrações novas, por exemplo:
   ```
   wrangler d1 execute painel-clientes-db --remote --file=./migrations/0032_arquivos_r2.sql
   ```

5. **Crie o bucket R2** (guarda o conteúdo dos arquivos da aba *Ferramentas → Arquivos*;
   o D1 fica só com os metadados):
   ```
   wrangler r2 bucket create acessosvirtual-arquivos
   ```
   O R2 tem plano gratuito, mas a Cloudflare pede um cartão cadastrado para habilitá-lo
   na conta (não cobra dentro da franquia).

7. **Configure as duas variáveis secretas** (uma vez):
   ```
   wrangler secret put SENHA_PAINEL
   wrangler secret put SEGREDO_SESSAO
   ```
   - `SENHA_PAINEL` — a senha única que todo mundo da empresa vai usar para entrar.
   - `SEGREDO_SESSAO` — uma string aleatória longa qualquer (só precisa ser difícil de
     adivinhar), usada para assinar o cookie de sessão. Pode gerar uma rodando
     `openssl rand -hex 32`.

8. **Publique:**
   ```
   npm install
   npm run deploy
   ```

Nenhum desses passos custa nada — tudo dentro do plano gratuito da Cloudflare.

## Publicar atualizações

O deploy **não** é automático no `git push`. Depois de commitar, rode na raiz do projeto:

```
npm run deploy
```

Isso faz o build do frontend (Angular), compila as `functions/` em `dist/worker/index.js`
(`wrangler pages functions build`) e publica o Worker com `wrangler deploy`. Os bindings
(`DB`, `BUCKET`, `ASSETS`) vêm do `wrangler.toml`, não precisa mexer no painel.

Se a atualização mexeu no banco, rode antes o arquivo de migração correspondente, ex.:
```
wrangler d1 execute painel-clientes-db --remote --file=./migrations/0032_arquivos_r2.sql
```
