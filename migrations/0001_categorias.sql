-- Adiciona categorias a bancos já existentes (schema.sql já cobre instalações novas)

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE clientes ADD COLUMN categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_categoria ON clientes(categoria_id);
