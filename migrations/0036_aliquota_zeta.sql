-- Alíquota do cliente (usada na configuração do Zeta). Preenchida na negociação e
-- carregada como snapshot pra Instalação, igual telefone/cnpj/e-mail.
ALTER TABLE clientes_negociacao ADD COLUMN aliquota TEXT;
ALTER TABLE instalacoes ADD COLUMN aliquota TEXT;
