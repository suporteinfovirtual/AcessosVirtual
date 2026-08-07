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
