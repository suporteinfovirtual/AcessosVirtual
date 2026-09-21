import type { Contexto } from '../_lib/env';
import { conflito, criado, json } from '../_lib/http';
import { Contabilidade } from '../_lib/schemas';
import { lerCorpo } from '../_lib/validacao';

const NOME_REPETIDO = 'Já existe uma contabilidade com esse nome';

// GET /api/contabilidades -> lista todas as contabilidades
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare('SELECT * FROM contabilidades ORDER BY nome').all();
  return json(results);
}

// POST /api/contabilidades -> cria uma contabilidade nova
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Contabilidade);
  if (erro) return erro;

  try {
    const resultado = await env.DB.prepare('INSERT INTO contabilidades (nome, email) VALUES (?, ?)')
      .bind(dados.nome, dados.email)
      .run();
    return criado({ id: resultado.meta.last_row_id, nome: dados.nome, email: dados.email });
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) return conflito(NOME_REPETIDO);
    throw e;
  }
}
