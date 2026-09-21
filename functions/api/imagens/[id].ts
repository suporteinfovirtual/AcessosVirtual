import type { ContextoComId } from '../_lib/env';
import { embutido, naoEncontrado, ok } from '../_lib/http';
import type { CorpoBinario } from '../_lib/http';
import { idDaRota } from '../_lib/validacao';

// GET /api/imagens/:id -> mostra uma imagem (print) de um passo do manual
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const registro = await env.DB.prepare(
    'SELECT imagem, imagem_tipo FROM manual_passo_imagens WHERE id = ?',
  )
    .bind(id)
    .first<{ imagem: CorpoBinario | null; imagem_tipo: string | null }>();

  if (!registro?.imagem) return naoEncontrado('Imagem não encontrada');

  return embutido(registro.imagem, registro.imagem_tipo);
}

// DELETE /api/imagens/:id -> remove uma imagem especifica do passo
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM manual_passo_imagens WHERE id = ?').bind(id).run();
  return ok();
}
