interface Env {
  DB: D1Database;
}

// PUT /api/links/:id -> atualiza título e/ou url do link
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { titulo?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  const titulo = body.titulo?.trim();
  const url = body.url?.trim();
  if (!titulo || !url) {
    return new Response(JSON.stringify({ erro: 'Título e link são obrigatórios' }), { status: 400 });
  }

  await env.DB.prepare('UPDATE links_pessoais SET titulo = ?, url = ? WHERE id = ?').bind(titulo, url, params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/links/:id -> remove o link
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;
  await env.DB.prepare('DELETE FROM links_pessoais WHERE id = ?').bind(params.id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
