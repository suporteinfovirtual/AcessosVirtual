-- Schema do painel interno (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);

-- Cada cliente pode ter vários acessos, um por sistema (anydesk / acesso_web / acesso_zeta)
CREATE TABLE IF NOT EXISTS acessos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('anydesk', 'acesso_web', 'acesso_zeta')),
  identificador TEXT, -- ID do AnyDesk, ou o CNPJ/link do acesso web, ou o e-mail de login do zeta
  usuario TEXT,
  senha TEXT,
  link TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_acessos_cliente ON acessos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acessos_tipo ON acessos(tipo);

-- Contas e serviços internos da própria empresa (e-mail, backup, licenças) - não ligados a um cliente
CREATE TABLE IF NOT EXISTS contas_internas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servico TEXT NOT NULL,
  usuario TEXT,
  senha TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
