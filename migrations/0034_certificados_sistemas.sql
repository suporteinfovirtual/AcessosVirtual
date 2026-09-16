-- Certificado digital (.pfx) pra clientes Uniplus/SGBR (tabela clientes_sistemas).
-- Mesmo formato de "certificados", que atende só os clientes unificados (Uniplus Web/Zeta).
CREATE TABLE IF NOT EXISTS certificados_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema_id INTEGER NOT NULL UNIQUE REFERENCES clientes_sistemas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo BLOB NOT NULL,
  senha TEXT,
  validade TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
