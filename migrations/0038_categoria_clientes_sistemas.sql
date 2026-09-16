-- Categoria também disponível pra clientes Uniplus/SGBR (tabela clientes_sistemas),
-- igual já funcionava pra AnyDesk/Acesso Web/Acesso Zeta (tabela clientes).
ALTER TABLE clientes_sistemas ADD COLUMN categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;
