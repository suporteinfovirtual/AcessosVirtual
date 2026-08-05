-- Registro de quando um cliente foi marcado como faturado. A lista de "pronto pra
-- faturar" é calculada na hora a partir de implantacoes (concluída, sem nenhuma outra
-- pendente no futuro) — esta tabela só guarda quem já foi marcado, pra sumir da lista
-- padrão e aparecer no filtro de faturados.
CREATE TABLE IF NOT EXISTS faturamento_clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  faturado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cliente_sistema, cliente_ref_id)
);
