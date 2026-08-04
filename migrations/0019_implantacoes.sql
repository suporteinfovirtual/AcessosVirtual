-- Agenda de implantação: visitas de treinamento marcadas num dia/hora pra um cliente já
-- cadastrado em Gestão > Clientes (Uniplus / Uniplus Web / SGBR / Zeta). Como esses clientes
-- vivem em tabelas diferentes (clientes_sistemas ou clientes), guardamos qual sistema e o id
-- de origem, mais o nome (snapshot, pra exibir sem precisar juntar as duas tabelas).
CREATE TABLE IF NOT EXISTS implantacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome TEXT NOT NULL,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  data TEXT NOT NULL, -- YYYY-MM-DD
  hora TEXT NOT NULL, -- HH:MM
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_implantacoes_data ON implantacoes(data);
