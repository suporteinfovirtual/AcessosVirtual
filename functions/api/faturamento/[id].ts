interface Env {
  DB: D1Database;
}

// DELETE /api/faturamento/:id -> desfaz a marcação de faturado (volta pra lista de pendentes)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM faturamento_clientes WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
