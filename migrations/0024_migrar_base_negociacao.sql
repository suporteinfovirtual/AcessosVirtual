-- Identifica se o cliente em negociação tem uma base de outro sistema que vai
-- precisar ser migrada. A base em si não é anexada nem guardada aqui — ela é
-- pega direto no computador do cliente (acesso remoto) na hora da implantação;
-- isso aqui é só um sinalizador pra equipe já saber que vai ter esse passo.
ALTER TABLE clientes_negociacao ADD COLUMN precisa_migrar_base INTEGER NOT NULL DEFAULT 0;
