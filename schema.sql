-- Schema do painel interno (Cloudflare D1 / SQLite)

-- Categorias livres pra agrupar clientes (ex: "Gula Mania", "Facção", "PDV")
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contabilidades cadastradas (nome + e-mail), reutilizáveis entre clientes
CREATE TABLE IF NOT EXISTS contabilidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  email TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  observacoes TEXT,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  licencas TEXT, -- usado no Acesso Zeta / Clientes > Zeta
  enquadramento_fiscal TEXT, -- usado no Acesso Zeta / Clientes > Zeta
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria ON clientes(categoria_id);

-- Cada cliente pode ter vários acessos, um por sistema (anydesk / acesso_web / acesso_zeta)
CREATE TABLE IF NOT EXISTS acessos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('anydesk', 'acesso_web', 'acesso_zeta')),
  identificador TEXT, -- ID do AnyDesk, ou o CNPJ/link do acesso web, ou o e-mail de login do zeta
  usuario TEXT,
  senha TEXT,
  link TEXT,
  servidor TEXT, -- número do servidor (acesso web)
  contabilidade_id INTEGER REFERENCES contabilidades(id) ON DELETE SET NULL, -- acesso web / acesso zeta
  enviar_contabilidade INTEGER NOT NULL DEFAULT 0, -- acesso web / acesso zeta
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_acessos_cliente ON acessos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_acessos_tipo ON acessos(tipo);

-- Controle mensal de envio: marca se o acesso ja foi enviado pra contabilidade
-- num determinado mes/ano (sem granularidade de dia, so mes mesmo).
CREATE TABLE IF NOT EXISTS envios_contabilidade_mensal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acesso_id INTEGER NOT NULL REFERENCES acessos(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL, -- 1 a 12
  enviado INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (acesso_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_envios_mensal_periodo ON envios_contabilidade_mensal(ano, mes);

-- Certificado digital (.pfx) de cada cliente, com validade extraída no upload
CREATE TABLE IF NOT EXISTS certificados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo BLOB NOT NULL,
  senha TEXT,
  validade TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Certificado digital (.pfx) pra clientes Uniplus/SGBR (tabela clientes_sistemas).
-- Mesmo formato de "certificados", que atende só os clientes unificados (Uniplus Web/Zeta).
CREATE TABLE IF NOT EXISTS certificados_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema_id INTEGER NOT NULL UNIQUE REFERENCES clientes_sistemas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo BLOB NOT NULL,
  senha TEXT,
  validade TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Manuais (passo a passo) com texto, prints e arquivos anexados por passo
CREATE TABLE IF NOT EXISTS manuais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS manual_passos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manual_id INTEGER NOT NULL REFERENCES manuais(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  texto TEXT,
  arquivo BLOB,
  arquivo_nome TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manual_passos_manual ON manual_passos(manual_id);

-- cada passo pode ter varias imagens (prints), coladas uma por uma
CREATE TABLE IF NOT EXISTS manual_passo_imagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passo_id INTEGER NOT NULL REFERENCES manual_passos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  imagem BLOB NOT NULL,
  imagem_nome TEXT,
  imagem_tipo TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_manual_passo_imagens_passo ON manual_passo_imagens(passo_id);

-- Wiki de erros: artigos pesquisáveis (código do erro, mensagem, causa, solução) com prints anexados
CREATE TABLE IF NOT EXISTS wiki_artigos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  codigo TEXT,
  mensagem_erro TEXT,
  causa TEXT,
  solucao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wiki_artigos_titulo ON wiki_artigos(titulo);

-- cada artigo pode ter varias imagens (prints), coladas uma por uma
CREATE TABLE IF NOT EXISTS wiki_artigo_imagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artigo_id INTEGER NOT NULL REFERENCES wiki_artigos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  imagem BLOB NOT NULL,
  imagem_nome TEXT,
  imagem_tipo TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wiki_artigo_imagens_artigo ON wiki_artigo_imagens(artigo_id);

-- Área separada "Clientes" com 4 sistemas (Uniplus, Uniplus Web, SGBR, Zeta)
CREATE TABLE IF NOT EXISTS clientes_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sistema TEXT NOT NULL CHECK (sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  licencas TEXT,
  enquadramento_fiscal TEXT,
  versao_build TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_sistema ON clientes_sistemas(sistema);
CREATE INDEX IF NOT EXISTS idx_clientes_sistemas_nome ON clientes_sistemas(nome);

-- Contas e serviços internos da própria empresa (e-mail, backup, licenças) - não ligados a um cliente
CREATE TABLE IF NOT EXISTS contas_internas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servico TEXT NOT NULL,
  usuario TEXT,
  senha TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Links pessoais de acesso rápido na tela inicial (wiki, portal, etc.)
CREATE TABLE IF NOT EXISTS links_pessoais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Arquivos genéricos guardados na aba Ferramentas > Arquivos (upload, download, substituir).
-- O conteúdo fica no R2 (binding BUCKET), identificado por r2_key; o D1 guarda só os metadados.
-- A coluna arquivo (BLOB) só existe para as linhas antigas, anteriores à migração pro R2.
CREATE TABLE IF NOT EXISTS arquivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_arquivo TEXT NOT NULL,
  titulo TEXT, -- nome amigável opcional, ex: "Script atalho do acesso"
  tipo TEXT,
  tamanho INTEGER NOT NULL,
  arquivo BLOB, -- legado: conteúdo das linhas antigas ainda no D1
  r2_key TEXT, -- chave do objeto no bucket R2 (arquivos novos)
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arquivos_nome ON arquivos(nome_arquivo);

-- Cadastro de licenças (Uniplus / Uniplus Web), reutilizável entre clientes
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

-- Clientes em negociação: cadastro simples pra prospects, feito só na aba Gestão > Negociação.
-- sistema e precisa_migrar_base guiam a coleta de dados; status controla o funil; convertido_em
-- marca quando o prospect virou um cliente de verdade em Gestão > Clientes.
CREATE TABLE IF NOT EXISTS clientes_negociacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT, -- só coletado quando sistema = zeta (usado no login do cliente)
  enquadramento_fiscal TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'em_negociacao',
  sistema TEXT,
  precisa_migrar_base INTEGER NOT NULL DEFAULT 0,
  motivo_desistencia TEXT,
  convertido_em TEXT,
  atualizado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_negociacao_nome ON clientes_negociacao(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_negociacao_status ON clientes_negociacao(status);

-- Técnicos: quem vai a campo dar treinamento nas implantações
CREATE TABLE IF NOT EXISTS tecnicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Agenda de implantação: visitas de treinamento marcadas num dia/hora pra um cliente já
-- cadastrado em Gestão > Clientes (Uniplus / Uniplus Web / SGBR / Zeta). Como esses clientes
-- vivem em tabelas diferentes (clientes_sistemas ou clientes), guardamos qual sistema e o id
-- de origem, mais o nome (snapshot, pra exibir sem precisar juntar as duas tabelas).
-- concluida_manual marca conclusão manual; se a data já passou, conta como concluída também.
CREATE TABLE IF NOT EXISTS implantacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome TEXT NOT NULL,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  data TEXT NOT NULL, -- YYYY-MM-DD
  hora TEXT NOT NULL, -- HH:MM
  observacoes TEXT,
  concluida_manual INTEGER NOT NULL DEFAULT 0,
  tecnico_id INTEGER REFERENCES tecnicos(id) ON DELETE SET NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_implantacoes_data ON implantacoes(data);
CREATE INDEX IF NOT EXISTS idx_implantacoes_tecnico ON implantacoes(tecnico_id);

-- Instalação: passo entre a negociação fechada e o agendamento do treinamento (implantação).
-- Nasce quando um prospect "fechou" e é enviado pra instalação — o cliente real já foi criado
-- em Gestão > Clientes nesse momento, então guardamos qual sistema e o id de origem (mesmo
-- padrão de implantacoes), mais um snapshot dos dados como foram lançados na negociação.
-- instalado + data_instalacao + tecnico_id registram a instalação física do sistema.
CREATE TABLE IF NOT EXISTS instalacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT, -- WhatsApp do cliente; começa igual ao telefone da negociação, editável
  email TEXT, -- e-mail de login do Zeta, snapshot do que foi lançado na negociação
  enquadramento_fiscal TEXT,
  precisa_migrar_base INTEGER NOT NULL DEFAULT 0,
  negociacao_id INTEGER REFERENCES clientes_negociacao(id) ON DELETE SET NULL,
  instalado INTEGER NOT NULL DEFAULT 0,
  data_instalacao TEXT, -- YYYY-MM-DD, preenchido ao marcar como instalado
  tecnico_id INTEGER REFERENCES tecnicos(id) ON DELETE SET NULL, -- quem instalou o sistema
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instalacoes_instalado ON instalacoes(instalado);
CREATE INDEX IF NOT EXISTS idx_instalacoes_cliente ON instalacoes(cliente_sistema, cliente_ref_id);

-- Registro de quando um cliente foi marcado como faturado. A lista de "pronto pra faturar"
-- é calculada na hora a partir de implantacoes — esta tabela só guarda quem já foi marcado.
CREATE TABLE IF NOT EXISTS faturamento_clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_sistema TEXT NOT NULL CHECK (cliente_sistema IN ('uniplus', 'uniplus_web', 'sgbr', 'zeta')),
  cliente_ref_id INTEGER NOT NULL,
  cliente_nome TEXT NOT NULL,
  faturado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cliente_sistema, cliente_ref_id)
);
