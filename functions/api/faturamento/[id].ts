import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { idDaRota } from '../_lib/validacao';

// DELETE /api/faturamento/:id -> desfaz a marcação de faturado (volta pra lista de pendentes)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM faturamento_clientes WHERE id = ?').bind(id).run();
  return ok();
}
