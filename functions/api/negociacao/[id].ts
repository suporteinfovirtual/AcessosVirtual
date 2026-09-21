import { z } from 'zod';
import { STATUS_NEGOCIACAO } from '../_lib/dominio';
import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { camposDeNegociacao } from '../_lib/schemas';
import { flag, idDaRota, lerCorpo, opcaoDe, textoOpcional } from '../_lib/validacao';

const Negociacao = z.object({
  ...camposDeNegociacao,
  status: opcaoDe(STATUS_NEGOCIACAO, 'Status inválido').nullish(),
  motivo_desistencia: textoOpcional,
  convertido: flag,
});

// PUT /api/negociacao/:id -> atualiza um cliente em negociação (status, sistema e conversão)
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Negociacao);
  if (erro) return erro;

  // convertido_em só é escrito quando convertido=true vem no corpo (marca "agora" no
  // servidor); nos demais salvamentos o valor que já estava gravado é preservado.
  await env.DB.prepare(
    `UPDATE clientes_negociacao
       SET nome = ?, cnpj = ?, telefone = ?, email = ?, aliquota = ?, enquadramento_fiscal = ?, observacoes = ?,
           precisa_migrar_base = ?, motivo_desistencia = ?, categoria_id = ?, status = COALESCE(?, status), sistema = COALESCE(?, sistema),
           convertido_em = CASE WHEN ? = 1 THEN datetime('now') ELSE convertido_em END,
           atualizado_em = datetime('now')
       WHERE id = ?`,
  )
    .bind(
      dados.nome,
      dados.cnpj,
      dados.telefone,
      dados.email,
      dados.aliquota,
      dados.enquadramento_fiscal,
      dados.observacoes,
      dados.precisa_migrar_base,
      dados.motivo_desistencia,
      dados.categoria_id,
      dados.status ?? null,
      dados.sistema ?? null,
      dados.convertido,
      id,
    )
    .run();

  return ok();
}

// DELETE /api/negociacao/:id -> remove um cliente em negociação
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM clientes_negociacao WHERE id = ?').bind(id).run();
  return ok();
}
