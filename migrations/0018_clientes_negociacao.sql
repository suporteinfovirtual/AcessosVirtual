-- Clientes em negociação: cadastro simples pra prospects, feito só na aba Gestão > Negociação
CREATE TABLE IF NOT EXISTS clientes_negociacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  enquadramento_fiscal TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_negociacao_nome ON clientes_negociacao(nome);
