-- Schema do painel interno (Cloudflare D1 / SQLite)

-- Categorias livres pra agrupar clientes (ex: "Gula Mania", "Facção", "PDV")
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contabilidades cadastradas (nome + e-mail), reutilizáveis entre clientes
CREATE TABLE IF NOT EXISTS contabilidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  observacoes TEXT,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria ON clientes(categoria_id);

-- Cada cliente pode ter vários acessos, um por sistema (anydesk / acesso_web / acesso_zeta)
CREATE TABLE IF NOT EXISTS acessos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('anydesk', 'acesso_web', 'acesso_zeta')),
  identificador TEXT, -- ID do AnyDesk, ou o CNPJ/link do acesso web, ou o e-mail de login do zeta
  usuario TEXT,
  senha TEXT,
  link TEXT,
  servidor TEXT, -- número do servidor (acesso web)
  contabilidade_id INTEGER REFERENCES contabilidades(id) ON DELETE SET NULL, -- acesso web / acesso zeta
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_acessos_cliente ON acessos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acessos_tipo ON acessos(tipo);

-- Certificado digital (.pfx) de cada cliente, com validade extraída no upload
CREATE TABLE IF NOT EXISTS certificados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo BLOB NOT NULL,
  senha TEXT,
  validade TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contas e serviços internos da própria empresa (e-mail, backup, licenças) - não ligados a um cliente
CREATE TABLE IF NOT EXISTS contas_internas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servico TEXT NOT NULL,
  usuario TEXT,
  senha TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Links pessoais de acesso rápido na tela inicial (wiki, portal, etc.)
CREATE TABLE IF NOT EXISTS links_pessoais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
