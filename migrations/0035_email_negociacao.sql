-- E-mail do cliente (usado no login do Zeta). Preenchido na negociação e carregado
-- como snapshot pra Instalação, igual telefone/cnpj/enquadramento_fiscal.
ALTER TABLE clientes_negociacao ADD COLUMN email TEXT;
ALTER TABLE instalacoes ADD COLUMN email TEXT;
