interface Env {
  DB: D1Database;
}

// GET /api/manuais -> lista os manuais (sem os passos, só a contagem)
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;

  const { results } = await env.DB
    .prepare(
      `SELECT manuais.*, COUNT(manual_passos.id) AS total_passos
       FROM manuais
       LEFT JOIN manual_passos ON manual_passos.manual_id = manuais.id
       GROUP BY manuais.id
       ORDER BY manuais.titulo`
    )
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/manuais -> cria um manual novo (só titulo/descricao, os passos são adicionados depois)
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { titulo?: string; descricao?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.titulo?.trim()) {
    return new Response(JSON.stringify({ erro: 'Título é obrigatório' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare('INSERT INTO manuais (titulo, descricao) VALUES (?, ?)')
    .bind(body.titulo.trim(), body.descricao?.trim() || null)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
