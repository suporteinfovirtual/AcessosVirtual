import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { camposDeAcesso } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

const AcessoEdicao = z.object(camposDeAcesso);

// PUT /api/acessos/:id -> atualiza um acesso específico
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, AcessoEdicao);
  if (erro) return erro;

  await env.DB.prepare(
    'UPDATE acessos SET identificador = ?, usuario = ?, senha = ?, link = ?, servidor = ?, contabilidade_id = ?, enviar_contabilidade = ?, observacoes = ? WHERE id = ?',
  )
    .bind(
      dados.identificador,
      dados.usuario,
      dados.senha,
      dados.link,
      dados.servidor,
      dados.contabilidade_id,
      dados.enviar_contabilidade,
      dados.observacoes,
      id,
    )
    .run();

  return ok();
}

// DELETE /api/acessos/:id -> remove um acesso específico
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM acessos WHERE id = ?').bind(id).run();
  return ok();
}
