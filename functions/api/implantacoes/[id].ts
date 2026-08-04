interface Env {
  DB: D1Database;
}

// PUT /api/implantacoes/:id -> reagenda (cliente, data ou hora) uma implantação
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    cliente_nome?: string;
    cliente_sistema?: string;
    cliente_ref_id?: number;
    data?: string;
    hora?: string;
    observacoes?: string;
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

  await env.DB
    .prepare(
      'UPDATE implantacoes SET cliente_nome = ?, cliente_sistema = ?, cliente_ref_id = ?, data = ?, hora = ?, observacoes = ? WHERE id = ?'
    )
    .bind(
      body.cliente_nome.trim(),
      body.cliente_sistema,
      body.cliente_ref_id,
      body.data.trim(),
      body.hora.trim(),
      body.observacoes?.trim() || null,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/implantacoes/:id -> cancela a implantação agendada
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM implantacoes WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
