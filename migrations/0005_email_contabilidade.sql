-- Adiciona o campo email_contabilidade aos acessos (bancos já existentes; schema.sql já cobre instalações novas)

ALTER TABLE acessos ADD COLUMN email_contabilidade TEXT;
