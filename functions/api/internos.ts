interface Env {
  DB: D1Database;
}

// GET /api/internos -> lista as contas/serviços internos da empresa
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT * FROM contas_internas ORDER BY servico').all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/internos -> cria uma nova conta/serviço interno
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { servico?: string; usuario?: string; senha?: string; observacoes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.servico?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome do serviço é obrigatório' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare('INSERT INTO contas_internas (servico, usuario, senha, observacoes) VALUES (?, ?, ?, ?)')
    .bind(body.servico.trim(), body.usuario || null, body.senha || null, body.observacoes || null)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
