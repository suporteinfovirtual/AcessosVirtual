interface Env {
  DB: D1Database;
}

// PUT /api/negociacao/:id -> atualiza um cliente em negociação
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { nome?: string; cnpj?: string; telefone?: string; enquadramento_fiscal?: string; observacoes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare('UPDATE clientes_negociacao SET nome = ?, cnpj = ?, telefone = ?, enquadramento_fiscal = ?, observacoes = ? WHERE id = ?')
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.telefone?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      body.observacoes?.trim() || null,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/negociacao/:id -> remove um cliente em negociação
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM clientes_negociacao WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
