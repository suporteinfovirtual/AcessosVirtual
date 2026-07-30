-- Transforma contabilidade/email_contabilidade (texto livre) numa tabela própria reutilizável

CREATE TABLE IF NOT EXISTS contabilidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE acessos ADD COLUMN contabilidade_id INTEGER REFERENCES contabilidades(id) ON DELETE SET NULL;

-- popula a tabela a partir dos valores já cadastrados nos acessos
INSERT INTO contabilidades (nome, email)
SELECT contabilidade, MAX(email_contabilidade)
FROM acessos
WHERE contabilidade IS NOT NULL AND contabilidade != ''
GROUP BY contabilidade;

-- liga cada acesso à contabilidade correspondente
UPDATE acessos
SET contabilidade_id = (SELECT id FROM contabilidades WHERE contabilidades.nome = acessos.contabilidade)
WHERE contabilidade IS NOT NULL AND contabilidade != '';

ALTER TABLE acessos DROP COLUMN contabilidade;
ALTER TABLE acessos DROP COLUMN email_contabilidade;
