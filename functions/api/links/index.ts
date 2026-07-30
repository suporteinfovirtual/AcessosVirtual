interface Env {
  DB: D1Database;
}

// GET /api/links -> lista todos os links pessoais
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT * FROM links_pessoais ORDER BY titulo').all();
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/links -> cria um link novo
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

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

  const resultado = await env.DB.prepare('INSERT INTO links_pessoais (titulo, url) VALUES (?, ?)').bind(titulo, url).run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id, titulo, url }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
