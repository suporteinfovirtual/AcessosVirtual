import type { Contexto } from './_lib/env';
import { criado, json } from './_lib/http';
import { ContaInterna } from './_lib/schemas';
import { lerCorpo } from './_lib/validacao';

// GET /api/internos -> lista as contas/serviços internos da empresa
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare('SELECT * FROM contas_internas ORDER BY servico').all();
  return json(results);
}

// POST /api/internos -> cria uma nova conta/serviço interno
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, ContaInterna);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO contas_internas (servico, usuario, senha, observacoes) VALUES (?, ?, ?, ?)',
  )
    .bind(dados.servico, dados.usuario, dados.senha, dados.observacoes)
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
