import type { ContextoComId } from '../_lib/env';
import { json, naoEncontrado, ok } from '../_lib/http';
import { ArtigoWiki } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

// GET /api/wiki/:id -> o artigo com as imagens anexadas (sem os bytes, só se existem)
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const artigo = await env.DB.prepare('SELECT * FROM wiki_artigos WHERE id = ?').bind(id).first();
  if (!artigo) return naoEncontrado('Artigo não encontrado');

  const { results: imagens } = await env.DB.prepare(
    'SELECT id, artigo_id, ordem, imagem_nome FROM wiki_artigo_imagens WHERE artigo_id = ? ORDER BY ordem',
  )
    .bind(id)
    .all();

  return json({ ...artigo, imagens });
}

// PUT /api/wiki/:id -> atualiza o artigo
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, ArtigoWiki);
  if (erro) return erro;

  await env.DB.prepare(
    `UPDATE wiki_artigos
       SET titulo = ?, codigo = ?, mensagem_erro = ?, causa = ?, solucao = ?, atualizado_em = datetime('now')
       WHERE id = ?`,
  )
    .bind(dados.titulo, dados.codigo, dados.mensagem_erro, dados.causa, dados.solucao, id)
    .run();

  return ok();
}

// DELETE /api/wiki/:id -> remove o artigo e as imagens dele (ON DELETE CASCADE)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM wiki_artigos WHERE id = ?').bind(id).run();
  return ok();
}
