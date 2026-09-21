-- Nem todo cliente contrata treinamento. Sem ele a instalação não entra na agenda de
-- implantação e, assim que for marcada como instalada, já conta como pronta pra faturar.
-- Começa em 0: quem precisar de treinamento é marcado na tela de Instalação.
ALTER TABLE instalacoes ADD COLUMN precisa_treinamento INTEGER NOT NULL DEFAULT 0;
