-- Marca se o acesso (acesso_web / acesso_zeta) deve ser enviado para a contabilidade

ALTER TABLE acessos ADD COLUMN enviar_contabilidade INTEGER NOT NULL DEFAULT 0;
