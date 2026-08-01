-- Unifica Uniplus Web com Acesso Web: a aba Uniplus Web dentro de "Clientes" passa a
-- usar direto a tabela clientes/acessos (mesma fonte do Acesso Web), sem cadastro proprio.

-- clientes_sistemas ja estava vazia para sistema='uniplus_web' nesta instalacao; a linha
-- abaixo so cobre o caso de existirem registros (nada a perder aqui).
DELETE FROM clientes_sistemas WHERE sistema = 'uniplus_web';
