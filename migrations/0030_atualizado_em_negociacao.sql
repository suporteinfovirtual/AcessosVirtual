-- Marca a última vez que um registro de negociação foi editado, pra dar pra identificar
-- prospects "parados" há muito tempo sem nenhuma atualização (usado no Resumo).
ALTER TABLE clientes_negociacao ADD COLUMN atualizado_em TEXT;

-- registros existentes ainda não têm atualizado_em: usa a data de criação como ponto de partida
UPDATE clientes_negociacao SET atualizado_em = criado_em WHERE atualizado_em IS NULL;
