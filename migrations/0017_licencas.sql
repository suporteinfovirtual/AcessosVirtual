-- Cadastro de licenças (Uniplus / Uniplus Web), reutilizável entre clientes, e os vínculos
-- muitos-para-muitos com cada uma das duas tabelas de cliente que existem hoje.

CREATE TABLE IF NOT EXISTS licencas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uniplus Web usa a tabela clientes (unificada com Acesso Web)
CREATE TABLE IF NOT EXISTS cliente_licencas (
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  licenca_id INTEGER NOT NULL REFERENCES licencas(id) ON DELETE CASCADE,
  PRIMARY KEY (cliente_id, licenca_id)
);

-- Uniplus usa a tabela clientes_sistemas (sistema = 'uniplus')
CREATE TABLE IF NOT EXISTS clientes_sistemas_licencas (
  cliente_sistema_id INTEGER NOT NULL REFERENCES clientes_sistemas(id) ON DELETE CASCADE,
  licenca_id INTEGER NOT NULL REFERENCES licencas(id) ON DELETE CASCADE,
  PRIMARY KEY (cliente_sistema_id, licenca_id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_licencas_licenca ON cliente_licencas(licenca_id);
CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_licencas_licenca ON clientes_sistemas_licencas(licenca_id);

INSERT OR IGNORE INTO licencas (nome) VALUES
  ('UNIPLUS Básico'),
  ('UNIPLUS Avançado'),
  ('Combo Gourmet'),
  ('Combo Mercado'),
  ('Combo Serviço'),
  ('Combo Varejo'),
  ('Contagem de estoque'),
  ('Atacarejo'),
  ('Boleto'),
  ('CT-e'),
  ('Cartão Fidelidade'),
  ('Centro de Custo'),
  ('Conciflex'),
  ('Controle Expedição e Conferência'),
  ('Controle de Lote/Validade'),
  ('Cotação Online'),
  ('Família de produtos'),
  ('GNRE On-line'),
  ('Gestão de Compras'),
  ('Gestão de documentos fiscais'),
  ('Gourmet Self-Service'),
  ('Integração Abrahão'),
  ('Integração Anota AI'),
  ('Integração CresceVendas'),
  ('Integração Delivery Goomer'),
  ('Integração E-Commerce'),
  ('Integração Fiscal'),
  ('Integração Gatecash (monitoramento PDVs)'),
  ('Integração Mercafácil Tempo Real (API)'),
  ('Limite de crédito por Forma Pagamento'),
  ('MDF-e'),
  ('MultiCPF'),
  ('Módulo GOURMET'),
  ('Nota Fiscal de Serviço Eletrônica'),
  ('Operação Fiscal'),
  ('Ordem de serviço'),
  ('PDV Off-line'),
  ('POS Integrado'),
  ('Produção'),
  ('Programação e reajuste de Preço'),
  ('Promoção por Combinação'),
  ('Promoção por Quota'),
  ('Reclassificação'),
  ('SHIPAY'),
  ('Self Checkout'),
  ('Sped Contribuições (PIS/COFINS)'),
  ('Systax'),
  ('TEF DISCADO'),
  ('TEF OUTROS (SITEF)'),
  ('TEF UNICO (SCOPE)'),
  ('Tabela de Preços Uniplus'),
  ('UNINFC-e'),
  ('UNIPAF'),
  ('UNISAT'),
  ('Uniplus Shop 100 produtos'),
  ('Uniplus Shop 1000 produtos'),
  ('Uniplus Shop Ilimitado'),
  ('Vale-Presente'),
  ('Incremento de usuários do UNIPLUS'),
  ('UniMobile PDV'),
  ('Unimobile Comanda'),
  ('Unimobile Vendas'),
  ('Alteração Razão Social'),
  ('Cálculo do IBS, CBS e IS para Lucro Presumido'),
  ('Cálculo do IBS, CBS e IS para Lucro Real'),
  ('Cálculo do IBS, CBS e IS para Simples Nacional Híbrido'),
  ('Mercado Pago'),
  ('Módulo MEI'),
  ('PagSeguro'),
  ('SCANNTECH');
