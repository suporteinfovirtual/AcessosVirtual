-- Custo e valor cobrado da mensalidade de cada cliente, pra calcular o lucro (valor
-- cobrado - custo) e a margem (lucro / valor cobrado) no relatório financeiro.
ALTER TABLE clientes ADD COLUMN custo_mensalidade REAL;
ALTER TABLE clientes ADD COLUMN valor_mensalidade REAL;
ALTER TABLE clientes_sistemas ADD COLUMN custo_mensalidade REAL;
ALTER TABLE clientes_sistemas ADD COLUMN valor_mensalidade REAL;
