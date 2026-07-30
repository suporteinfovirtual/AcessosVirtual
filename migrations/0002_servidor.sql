-- Adiciona o campo servidor aos acessos (bancos já existentes; schema.sql já cobre instalações novas)

ALTER TABLE acessos ADD COLUMN servidor TEXT;
