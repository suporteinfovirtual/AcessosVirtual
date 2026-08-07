interface Env {
  DB: D1Database;
}

// GET /api/wiki -> lista todos os artigos (usado pra busca/filtro no cliente)
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;

  const { results } = await env.DB.prepare('SELECT * FROM wiki_artigos ORDER BY titulo').all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/wiki -> cria um artigo novo
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { titulo?: string; codigo?: string; mensagem_erro?: string; causa?: string; solucao?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.titulo?.trim()) {
    return new Response(JSON.stringify({ erro: 'Título é obrigatório' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare('INSERT INTO wiki_artigos (titulo, codigo, mensagem_erro, causa, solucao) VALUES (?, ?, ?, ?, ?)')
    .bind(
      body.titulo.trim(),
      body.codigo?.trim() || null,
      body.mensagem_erro?.trim() || null,
      body.causa?.trim() || null,
      body.solucao?.trim() || null
    )
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
