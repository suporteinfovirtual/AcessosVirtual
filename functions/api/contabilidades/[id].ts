interface Env {
  DB: D1Database;
}

// PUT /api/contabilidades/:id -> atualiza nome e/ou e-mail
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

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
    await env.DB
      .prepare('UPDATE contabilidades SET nome = ?, email = ? WHERE id = ?')
      .bind(nome, body.email?.trim() || null, params.id)
      .run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ erro: 'Já existe uma contabilidade com esse nome' }), { status: 409 });
  }
}

// DELETE /api/contabilidades/:id -> remove a contabilidade (acessos ligados a ela ficam sem contabilidade)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;
  await env.DB.prepare('DELETE FROM contabilidades WHERE id = ?').bind(params.id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
