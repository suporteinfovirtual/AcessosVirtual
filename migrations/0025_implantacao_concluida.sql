-- Marca manual de conclusão da implantação. Some com a data (se já passou, considera
-- concluída mesmo sem marcação manual) pra decidir quando o cliente libera pro Faturamento.
ALTER TABLE implantacoes ADD COLUMN concluida_manual INTEGER NOT NULL DEFAULT 0;
