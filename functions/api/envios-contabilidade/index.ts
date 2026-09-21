import { z } from 'zod';
import type { Contexto } from '../_lib/env';
import { json, ok } from '../_lib/http';
import { flag, idObrigatorio, lerConsulta, lerCorpo } from '../_lib/validacao';

const PERIODO_INVALIDO = 'Parâmetros ano/mes inválidos';

const ano = z.coerce
  .number({ error: PERIODO_INVALIDO })
  .int({ error: PERIODO_INVALIDO })
  .positive({ error: PERIODO_INVALIDO });
const mes = z.coerce
  .number({ error: PERIODO_INVALIDO })
  .int({ error: PERIODO_INVALIDO })
  .min(1, { error: PERIODO_INVALIDO })
  .max(12, { error: PERIODO_INVALIDO });

const Periodo = z.object({ ano, mes });

const Marcacao = z.object({
  acesso_id: idObrigatorio('Parâmetros inválidos'),
  ano,
  mes,
  enviado: flag,
});

// GET /api/envios-contabilidade?ano=2026&mes=8 -> status de envio de cada acesso naquele mes
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Periodo);
  if (erro) return erro;

  const { results } = await env.DB.prepare(
    'SELECT acesso_id, enviado FROM envios_contabilidade_mensal WHERE ano = ? AND mes = ?',
  )
    .bind(dados.ano, dados.mes)
    .all();

  return json(results);
}

// PUT /api/envios-contabilidade -> marca/desmarca o envio de um acesso num mes/ano
export async function onRequestPut({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Marcacao);
  if (erro) return erro;

  await env.DB.prepare(
    `INSERT INTO envios_contabilidade_mensal (acesso_id, ano, mes, enviado, atualizado_em)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT (acesso_id, ano, mes) DO UPDATE SET enviado = excluded.enviado, atualizado_em = excluded.atualizado_em`,
  )
    .bind(dados.acesso_id, dados.ano, dados.mes, dados.enviado)
    .run();

  return ok();
}
