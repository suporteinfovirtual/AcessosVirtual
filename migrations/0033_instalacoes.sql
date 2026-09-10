-- Instalação: passo entre a negociação fechada e o agendamento do treinamento (implantação).
-- Nasce quando um prospect "fechou" e é enviado pra instalação — o cliente real já foi criado
-- em Gestão > Clientes nesse momento, então guardamos qual sistema e o id de origem (mesmo
-- padrão de implantacoes), mais um snapshot dos dados como foram lançados na negociação.
-- instalado + data_instalacao + tecnico_id registram a instalação física do sistema.
CREATE TABLE IF NOT EXISTS instalacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT, -- WhatsApp do cliente; começa igual ao telefone da negociação, editável
  enquadramento_fiscal TEXT,
  precisa_migrar_base INTEGER NOT NULL DEFAULT 0,
  negociacao_id INTEGER REFERENCES clientes_negociacao(id) ON DELETE SET NULL,
  instalado INTEGER NOT NULL DEFAULT 0,
  data_instalacao TEXT, -- YYYY-MM-DD, preenchido ao marcar como instalado
  tecnico_id INTEGER REFERENCES tecnicos(id) ON DELETE SET NULL, -- quem instalou o sistema
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instalacoes_instalado ON instalacoes(instalado);
CREATE INDEX IF NOT EXISTS idx_instalacoes_cliente ON instalacoes(cliente_sistema, cliente_ref_id);
