interface Env {
  DB: D1Database;
}

// GET /api/contabilidades -> lista todas as contabilidades
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT * FROM contabilidades ORDER BY nome').all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/contabilidades -> cria uma contabilidade nova
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { nome?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  const nome = body.nome?.trim();
  if (!nome) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  try {
    const resultado = await env.DB
      .prepare('INSERT INTO contabilidades (nome, email) VALUES (?, ?)')
      .bind(nome, body.email?.trim() || null)
      .run();
    return new Response(JSON.stringify({ id: resultado.meta.last_row_id, nome, email: body.email?.trim() || null }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ erro: 'Já existe uma contabilidade com esse nome' }), { status: 409 });
  }
}
