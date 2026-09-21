import type { ContextoComId } from '../../_lib/env';
import { embutido, naoEncontrado, ok } from '../../_lib/http';
import type { CorpoBinario } from '../../_lib/http';
import { idDaRota } from '../../_lib/validacao';

// GET /api/wiki/imagens/:id -> mostra uma imagem (print) anexada a um artigo da wiki
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const registro = await env.DB.prepare(
    'SELECT imagem, imagem_tipo FROM wiki_artigo_imagens WHERE id = ?',
  )
    .bind(id)
    .first<{ imagem: CorpoBinario | null; imagem_tipo: string | null }>();

  if (!registro?.imagem) return naoEncontrado('Imagem não encontrada');

  return embutido(registro.imagem, registro.imagem_tipo);
}

// DELETE /api/wiki/imagens/:id -> remove uma imagem específica do artigo
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM wiki_artigo_imagens WHERE id = ?').bind(id).run();
  return ok();
}
