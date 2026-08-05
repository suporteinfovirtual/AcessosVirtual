-- Técnico responsável por dar o treinamento na implantação. Se o técnico for excluído,
-- as implantações ligadas a ele simplesmente ficam sem técnico (não apaga o histórico).
ALTER TABLE implantacoes ADD COLUMN tecnico_id INTEGER REFERENCES tecnicos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_implantacoes_tecnico ON implantacoes(tecnico_id);
