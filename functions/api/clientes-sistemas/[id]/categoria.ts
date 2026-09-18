interface Env {
  DB: D1Database;
}

// PUT /api/clientes-sistemas/:id/categoria -> troca só a categoria do cliente (usado na tela de Instalação,
// que não tem os outros campos do cadastro pra mandar no PUT completo)
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { categoria_id?: number | null };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  await env.DB.prepare('UPDATE clientes_sistemas SET categoria_id = ? WHERE id = ?').bind(body.categoria_id || null, params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
