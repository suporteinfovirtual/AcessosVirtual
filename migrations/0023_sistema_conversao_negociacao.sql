-- Adiciona o sistema negociado (mesmo domínio usado em clientes_sistemas/implantacoes:
-- uniplus | uniplus_web | sgbr | zeta) e o registro de quando a negociação foi convertida
-- num cliente de verdade em Gestão > Clientes — base pro botão "Converter em cliente".
ALTER TABLE clientes_negociacao ADD COLUMN sistema TEXT;
ALTER TABLE clientes_negociacao ADD COLUMN convertido_em TEXT;
