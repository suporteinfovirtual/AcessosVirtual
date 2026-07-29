interface Env {
  DB: D1Database;
}

// GET /api/clientes/:id -> um cliente com todos os acessos dele
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const cliente = await env.DB.prepare('SELECT * FROM clientes WHERE id = ?').bind(params.id).first();
  if (!cliente) {
    return new Response(JSON.stringify({ erro: 'Cliente não encontrado' }), { status: 404 });
  }

  const { results: acessos } = await env.DB
    .prepare('SELECT * FROM acessos WHERE cliente_id = ?')
    .bind(params.id)
    .all();

  return new Response(JSON.stringify({ ...cliente, acessos }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/clientes/:id -> atualiza nome, cnpj ou observações do cliente
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { nome?: string; cnpj?: string; observacoes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare('UPDATE clientes SET nome = ?, cnpj = ?, observacoes = ? WHERE id = ?')
    .bind(body.nome.trim(), body.cnpj?.trim() || null, body.observacoes?.trim() || null, params.id)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/clientes/:id -> remove o cliente e os acessos dele (ON DELETE CASCADE cuida dos acessos)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM clientes WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
