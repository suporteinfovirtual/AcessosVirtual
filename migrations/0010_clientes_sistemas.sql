-- Nova area separada "Clientes" com 4 sistemas (Uniplus, Uniplus Web, SGBR, Zeta)

CREATE TABLE IF NOT EXISTS clientes_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sistema TEXT NOT NULL CHECK (sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  nome TEXT NOT NULL,
  cnpj TEXT,
  licencas TEXT,
  enquadramento_fiscal TEXT,
  versao_build TEXT, -- só usado em uniplus / uniplus_web
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_sistema ON clientes_sistemas(sistema);
CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_nome ON clientes_sistemas(nome);
