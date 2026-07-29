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

5. **Suba este código para um repositório privado no GitHub** (crie o repositório como
   privado, sem exceção).

6. **Conecte o repositório à Cloudflare Pages:**
   - No painel da Cloudflare, vá em *Workers & Pages* → *Create* → *Pages* → *Connect to Git*.
   - Escolha este repositório.
   - Em *Build settings*, use:
     - Build command: `cd frontend && npm install && npm run build`
     - Build output directory: `frontend/dist/frontend/browser`
     (o mesmo caminho já configurado em `pages_build_output_dir` no `wrangler.toml`.)

7. **Configure o banco no projeto Pages:** *Settings* → *Functions* → *D1 database bindings* →
   *Add binding* → nome `DB` → selecione `painel-clientes-db`.

8. **Configure as duas variáveis secretas** em *Settings* → *Environment variables* (marcar
   como *Secret*, não texto simples):
   - `SENHA_PAINEL` — a senha única que todo mundo da empresa vai usar para entrar.
   - `SEGREDO_SESSAO` — uma string aleatória longa qualquer (só precisa ser difícil de
     adivinhar), usada para assinar o cookie de sessão. Pode gerar uma rodando
     `openssl rand -hex 32`.

9. Depois disso, cada `git push` no repositório publica a versão mais nova automaticamente.

Nenhum desses passos custa nada — tudo dentro do plano gratuito da Cloudflare.
