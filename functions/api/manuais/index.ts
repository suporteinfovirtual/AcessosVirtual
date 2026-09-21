import type { Contexto } from '../_lib/env';
import { criado, json } from '../_lib/http';
import { Manual } from '../_lib/schemas';
import { lerCorpo } from '../_lib/validacao';

// GET /api/manuais -> lista os manuais (sem os passos, só a contagem)
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare(
    `SELECT manuais.*, COUNT(manual_passos.id) AS total_passos
       FROM manuais
       LEFT JOIN manual_passos ON manual_passos.manual_id = manuais.id
       GROUP BY manuais.id
       ORDER BY manuais.titulo`,
  ).all();

  return json(results);
}

// POST /api/manuais -> cria um manual novo (só titulo/descricao, os passos são adicionados depois)
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Manual);
  if (erro) return erro;

  const resultado = await env.DB.prepare('INSERT INTO manuais (titulo, descricao) VALUES (?, ?)')
    .bind(dados.titulo, dados.descricao)
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
