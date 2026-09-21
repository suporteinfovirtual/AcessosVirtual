import { z } from 'zod';
import type { Contexto } from './_lib/env';
import { criado, json } from './_lib/http';
import { camposDeImplantacao } from './_lib/schemas';
import { lerCorpo } from './_lib/validacao';

const Implantacao = z.object(camposDeImplantacao);

// GET /api/implantacoes -> lista todas as implantações agendadas (com o nome do técnico responsável)
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare(
    `SELECT implantacoes.*, tecnicos.nome AS tecnico_nome
       FROM implantacoes LEFT JOIN tecnicos ON tecnicos.id = implantacoes.tecnico_id
       ORDER BY data, hora`,
  ).all();

  return json(results);
}

// POST /api/implantacoes -> agenda uma nova implantação
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Implantacao);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO implantacoes (cliente_nome, cliente_sistema, cliente_ref_id, data, hora, observacoes, tecnico_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      dados.cliente_nome,
      dados.cliente_sistema,
      dados.cliente_ref_id,
      dados.data,
      dados.hora,
      dados.observacoes,
      dados.tecnico_id,
    )
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
