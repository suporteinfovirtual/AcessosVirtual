-- Arquivos da aba Ferramentas > Arquivos passam a ser guardados no R2 (binding BUCKET).
-- O D1 fica só com os metadados + a chave do objeto no bucket (r2_key).
-- As linhas antigas continuam com o conteúdo no BLOB `arquivo` (a leitura tem fallback),
-- por isso `arquivo` deixa de ser NOT NULL. Nada referencia a tabela arquivos, então
-- dá pra recriar sem mexer em foreign keys.

CREATE TABLE arquivos_novo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_arquivo TEXT NOT NULL,
  titulo TEXT,
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  arquivo BLOB,
  r2_key TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO arquivos_novo (id, nome_arquivo, titulo, tipo, tamanho, arquivo, r2_key, criado_em, atualizado_em)
SELECT id, nome_arquivo, titulo, tipo, tamanho, arquivo, NULL, criado_em, atualizado_em FROM arquivos;

DROP TABLE arquivos;
ALTER TABLE arquivos_novo RENAME TO arquivos;

CREATE INDEX IF NOT EXISTS idx_arquivos_nome ON arquivos(nome_arquivo);
