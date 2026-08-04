-- Status do prospect em negociação: em_negociacao (padrão) / desistiu / fechou
ALTER TABLE clientes_negociacao ADD COLUMN status TEXT NOT NULL DEFAULT 'em_negociacao';

CREATE INDEX IF NOT EXISTS idx_clientes_negociacao_status ON clientes_negociacao(status);
