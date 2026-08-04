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
  licencas TEXT, -- usado no Acesso Zeta / Clientes > Zeta
  enquadramento_fiscal TEXT, -- usado no Acesso Zeta / Clientes > Zeta
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
  enviar_contabilidade INTEGER NOT NULL DEFAULT 0, -- acesso web / acesso zeta
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_acessos_cliente ON acessos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acessos_tipo ON acessos(tipo);

-- Controle mensal de envio: marca se o acesso ja foi enviado pra contabilidade
-- num determinado mes/ano (sem granularidade de dia, so mes mesmo).
CREATE TABLE IF NOT EXISTS envios_contabilidade_mensal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acesso_id INTEGER NOT NULL REFERENCES acessos(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL, -- 1 a 12
  enviado INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (acesso_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_envios_mensal_periodo ON envios_contabilidade_mensal(ano, mes);

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

-- Manuais (passo a passo) com texto, prints e arquivos anexados por passo
CREATE TABLE IF NOT EXISTS manuais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manual_passos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manual_id INTEGER NOT NULL REFERENCES manuais(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  texto TEXT,
  arquivo BLOB,
  arquivo_nome TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manual_passos_manual ON manual_passos(manual_id);

-- cada passo pode ter varias imagens (prints), coladas uma por uma
CREATE TABLE IF NOT EXISTS manual_passo_imagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passo_id INTEGER NOT NULL REFERENCES manual_passos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  imagem BLOB NOT NULL,
  imagem_nome TEXT,
  imagem_tipo TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manual_passo_imagens_passo ON manual_passo_imagens(passo_id);

-- Área separada "Clientes" com 4 sistemas (Uniplus, Uniplus Web, SGBR, Zeta)
CREATE TABLE IF NOT EXISTS clientes_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sistema TEXT NOT NULL CHECK (sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  nome TEXT NOT NULL,
  cnpj TEXT,
  licencas TEXT,
  enquadramento_fiscal TEXT,
  versao_build TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_sistema ON clientes_sistemas(sistema);
CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_nome ON clientes_sistemas(nome);

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

-- Arquivos genéricos guardados na aba Ferramentas > Arquivos (upload, download, substituir)
CREATE TABLE IF NOT EXISTS arquivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_arquivo TEXT NOT NULL,
  titulo TEXT, -- nome amigável opcional, ex: "Script atalho do acesso"
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  arquivo BLOB NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arquivos_nome ON arquivos(nome_arquivo);

-- Cadastro de licenças (Uniplus / Uniplus Web), reutilizável entre clientes
CREATE TABLE IF NOT EXISTS licencas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uniplus Web usa a tabela clientes (unificada com Acesso Web)
CREATE TABLE IF NOT EXISTS cliente_licencas (
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  licenca_id INTEGER NOT NULL REFERENCES licencas(id) ON DELETE CASCADE,
  PRIMARY KEY (cliente_id, licenca_id)
);

-- Uniplus usa a tabela clientes_sistemas (sistema = 'uniplus')
CREATE TABLE IF NOT EXISTS clientes_sistemas_licencas (
  cliente_sistema_id INTEGER NOT NULL REFERENCES clientes_sistemas(id) ON DELETE CASCADE,
  licenca_id INTEGER NOT NULL REFERENCES licencas(id) ON DELETE CASCADE,
  PRIMARY KEY (cliente_sistema_id, licenca_id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_licencas_licenca ON cliente_licencas(licenca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_licencas_licenca ON clientes_sistemas_licencas(licenca_id);
