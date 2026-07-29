interface Env {
  DB: D1Database;
}

// PUT /api/internos/:id -> atualiza uma conta/serviço interno
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { servico?: string; usuario?: string; senha?: string; observacoes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.servico?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome do serviço é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare('UPDATE contas_internas SET servico = ?, usuario = ?, senha = ?, observacoes = ? WHERE id = ?')
    .bind(body.servico.trim(), body.usuario || null, body.senha || null, body.observacoes || null, params.id)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/internos/:id -> remove uma conta/serviço interno
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM contas_internas WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
