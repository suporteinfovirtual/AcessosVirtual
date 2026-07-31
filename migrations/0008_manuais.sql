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
  imagem BLOB,
  imagem_nome TEXT,
  imagem_tipo TEXT,
  arquivo BLOB,
  arquivo_nome TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manual_passos_manual ON manual_passos(manual_id);
