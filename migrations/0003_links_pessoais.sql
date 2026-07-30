-- Adiciona links pessoais a bancos já existentes (schema.sql já cobre instalações novas)

CREATE TABLE IF NOT EXISTS links_pessoais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
