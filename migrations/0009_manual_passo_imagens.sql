-- Permite varias imagens por passo do manual (antes so tinha uma imagem por passo)

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

-- migra a imagem unica que ja existia (se houver) pra virar a primeira imagem da lista
INSERT INTO manual_passo_imagens (passo_id, ordem, imagem, imagem_nome, imagem_tipo)
SELECT id, 1, imagem, imagem_nome, imagem_tipo FROM manual_passos WHERE imagem IS NOT NULL;

ALTER TABLE manual_passos DROP COLUMN imagem;
ALTER TABLE manual_passos DROP COLUMN imagem_nome;
ALTER TABLE manual_passos DROP COLUMN imagem_tipo;
