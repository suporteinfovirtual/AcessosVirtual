-- Telefone do cliente, formato (DDD) 9 XXXX-XXXX, nos três cadastros de cliente existentes
ALTER TABLE clientes ADD COLUMN telefone TEXT;
ALTER TABLE clientes_sistemas ADD COLUMN telefone TEXT;
ALTER TABLE clientes_negociacao ADD COLUMN telefone TEXT;
