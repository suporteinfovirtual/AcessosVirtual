interface Env {
  DB: D1Database;
}

// GET /api/implantacoes -> lista todas as implantações agendadas
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT * FROM implantacoes ORDER BY data, hora').all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/implantacoes -> agenda uma nova implantação
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: {
    cliente_nome?: string;
    cliente_sistema?: string;
    cliente_ref_id?: number;
    data?: string;
    hora?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.cliente_nome?.trim() || !body.cliente_sistema || !body.cliente_ref_id) {
    return new Response(JSON.stringify({ erro: 'Cliente é obrigatório' }), { status: 400 });
  }
  if (!body.data?.trim() || !body.hora?.trim()) {
    return new Response(JSON.stringify({ erro: 'Data e hora são obrigatórias' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare(
      'INSERT INTO implantacoes (cliente_nome, cliente_sistema, cliente_ref_id, data, hora) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(body.cliente_nome.trim(), body.cliente_sistema, body.cliente_ref_id, body.data.trim(), body.hora.trim())
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
