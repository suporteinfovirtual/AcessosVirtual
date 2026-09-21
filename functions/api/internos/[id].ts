import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { ContaInterna } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

// PUT /api/internos/:id -> atualiza uma conta/serviço interno
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, ContaInterna);
  if (erro) return erro;

  await env.DB.prepare(
    'UPDATE contas_internas SET servico = ?, usuario = ?, senha = ?, observacoes = ? WHERE id = ?',
  )
    .bind(dados.servico, dados.usuario, dados.senha, dados.observacoes, id)
    .run();

  return ok();
}

// DELETE /api/internos/:id -> remove uma conta/serviço interno
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM contas_internas WHERE id = ?').bind(id).run();
  return ok();
}
