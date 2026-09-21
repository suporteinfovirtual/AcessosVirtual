import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { Link } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

// PUT /api/links/:id -> atualiza título e/ou url do link
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Link);
  if (erro) return erro;

  await env.DB.prepare('UPDATE links_pessoais SET titulo = ?, url = ? WHERE id = ?')
    .bind(dados.titulo, dados.url, id)
    .run();

  return ok();
}

// DELETE /api/links/:id -> remove o link
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM links_pessoais WHERE id = ?').bind(id).run();
  return ok();
}
