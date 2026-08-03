-- Arquivos genéricos guardados na aba Ferramentas > Arquivos (upload, download, substituir)
CREATE TABLE IF NOT EXISTS arquivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  arquivo BLOB NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arquivos_nome ON arquivos(nome_arquivo);
