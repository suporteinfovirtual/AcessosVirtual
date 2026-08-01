-- Controle mensal de envio: marca se o acesso ja foi enviado pra contabilidade
-- num determinado mes/ano (sem granularidade de dia, so mes mesmo).

CREATE TABLE IF NOT EXISTS envios_contabilidade_mensal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acesso_id INTEGER NOT NULL REFERENCES acessos(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL, -- 1 a 12
  enviado INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (acesso_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_envios_mensal_periodo ON envios_contabilidade_mensal(ano, mes);
