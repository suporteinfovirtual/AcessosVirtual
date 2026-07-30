-- Adiciona o campo contabilidade aos acessos (bancos já existentes; schema.sql já cobre instalações novas)

ALTER TABLE acessos ADD COLUMN contabilidade TEXT;
