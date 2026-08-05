-- Motivo registrado quando um prospect em negociação é marcado como "Desistiu",
-- pra entender depois por que se perdeu aquele cliente.
ALTER TABLE clientes_negociacao ADD COLUMN motivo_desistencia TEXT;
