import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { camposDeImplantacao } from '../_lib/schemas';
import { flag, idDaRota, lerCorpo } from '../_lib/validacao';

const Implantacao = z.object({
  ...camposDeImplantacao,
  concluida_manual: flag,
});

// PUT /api/implantacoes/:id -> reagenda (cliente, data ou hora) uma implantação
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Implantacao);
  if (erro) return erro;

  await env.DB.prepare(
    'UPDATE implantacoes SET cliente_nome = ?, cliente_sistema = ?, cliente_ref_id = ?, data = ?, hora = ?, observacoes = ?, concluida_manual = ?, tecnico_id = ? WHERE id = ?',
  )
    .bind(
      dados.cliente_nome,
      dados.cliente_sistema,
      dados.cliente_ref_id,
      dados.data,
      dados.hora,
      dados.observacoes,
      dados.concluida_manual,
      dados.tecnico_id,
      id,
    )
    .run();

  return ok();
}

// DELETE /api/implantacoes/:id -> cancela a implantação agendada
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM implantacoes WHERE id = ?').bind(id).run();
  return ok();
}
