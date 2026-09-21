import type { ContextoComId } from '../_lib/env';
import { conflito, ok } from '../_lib/http';
import { Contabilidade } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

// PUT /api/contabilidades/:id -> atualiza nome e/ou e-mail
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Contabilidade);
  if (erro) return erro;

  try {
    await env.DB.prepare('UPDATE contabilidades SET nome = ?, email = ? WHERE id = ?')
      .bind(dados.nome, dados.email, id)
      .run();
    return ok();
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) {
      return conflito('Já existe uma contabilidade com esse nome');
    }
    throw e;
  }
}

// DELETE /api/contabilidades/:id -> remove a contabilidade (acessos ligados a ela ficam sem contabilidade)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM contabilidades WHERE id = ?').bind(id).run();
  return ok();
}
