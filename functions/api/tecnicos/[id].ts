interface Env {
  DB: D1Database;
}

// PUT /api/tecnicos/:id -> renomeia o técnico
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { nome?: string };
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
    await env.DB.prepare('UPDATE tecnicos SET nome = ? WHERE id = ?').bind(nome, params.id).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ erro: 'Já existe um técnico com esse nome' }), { status: 409 });
  }
}

// DELETE /api/tecnicos/:id -> remove o técnico (implantações ligadas a ele ficam sem técnico)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;
  await env.DB.prepare('DELETE FROM tecnicos WHERE id = ?').bind(params.id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
