import type { Contexto } from '../_lib/env';
import { criado, json } from '../_lib/http';
import { Link } from '../_lib/schemas';
import { lerCorpo } from '../_lib/validacao';

// GET /api/links -> lista todos os links pessoais
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare('SELECT * FROM links_pessoais ORDER BY titulo').all();
  return json(results);
}

// POST /api/links -> cria um link novo
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Link);
  if (erro) return erro;

  const resultado = await env.DB.prepare('INSERT INTO links_pessoais (titulo, url) VALUES (?, ?)')
    .bind(dados.titulo, dados.url)
    .run();

  return criado({ id: resultado.meta.last_row_id, titulo: dados.titulo, url: dados.url });
}
