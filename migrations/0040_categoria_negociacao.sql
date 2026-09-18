-- Categoria (ramo da empresa) já escolhida na negociação; vai junto pro cliente
-- quando ele é enviado pra Instalação.
ALTER TABLE clientes_negociacao ADD COLUMN categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;
