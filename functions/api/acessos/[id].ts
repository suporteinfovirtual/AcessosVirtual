interface Env {
  DB: D1Database;
}

// PUT /api/acessos/:id -> atualiza um acesso específico
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    identificador?: string;
    usuario?: string;
    senha?: string;
    link?: string;
    servidor?: string;
    contabilidade?: string;
    email_contabilidade?: string;
    observacoes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  await env.DB
    .prepare(
      'UPDATE acessos SET identificador = ?, usuario = ?, senha = ?, link = ?, servidor = ?, contabilidade = ?, email_contabilidade = ?, observacoes = ? WHERE id = ?'
    )
    .bind(
      body.identificador || null,
      body.usuario || null,
      body.senha || null,
      body.link || null,
      body.servidor || null,
      body.contabilidade || null,
      body.email_contabilidade || null,
      body.observacoes || null,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/acessos/:id -> remove um acesso específico
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM acessos WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
