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
