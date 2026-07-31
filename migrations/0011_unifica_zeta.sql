-- Unifica Acesso Zeta com Clientes > Zeta: licencas e enquadramento fiscal passam
-- a viver direto na tabela clientes (mesma fonte usada pelo Acesso Zeta)

ALTER TABLE clientes ADD COLUMN licencas TEXT;
ALTER TABLE clientes ADD COLUMN enquadramento_fiscal TEXT;

-- os registros que tinham sido importados pra clientes_sistemas (sistema='zeta') ficam
-- redundantes agora que a aba Zeta usa direto a tabela clientes/acessos
DELETE FROM clientes_sistemas WHERE sistema = 'zeta';
