import type { Contexto } from '../_lib/env';
import { criado, json } from '../_lib/http';
import { ArtigoWiki } from '../_lib/schemas';
import { lerCorpo } from '../_lib/validacao';

// GET /api/wiki -> lista todos os artigos (usado pra busca/filtro no cliente)
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare('SELECT * FROM wiki_artigos ORDER BY titulo').all();
  return json(results);
}

// POST /api/wiki -> cria um artigo novo
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, ArtigoWiki);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO wiki_artigos (titulo, codigo, mensagem_erro, causa, solucao) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(dados.titulo, dados.codigo, dados.mensagem_erro, dados.causa, dados.solucao)
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
