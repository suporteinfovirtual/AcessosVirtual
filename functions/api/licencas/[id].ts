interface Env {
  DB: D1Database;
}

// PUT /api/licencas/:id -> renomeia a licença
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
    await env.DB.prepare('UPDATE licencas SET nome = ? WHERE id = ?').bind(nome, params.id).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ erro: 'Já existe uma licença com esse nome' }), { status: 409 });
  }
}

// DELETE /api/licencas/:id -> remove a licença (clientes ligados a ela perdem o vínculo)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;
  await env.DB.prepare('DELETE FROM licencas WHERE id = ?').bind(params.id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
