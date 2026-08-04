interface Env {
  DB: D1Database;
}

// GET /api/negociacao?busca=texto -> lista os clientes em negociação, filtrando por nome e/ou cnpj
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const busca = url.searchParams.get('busca')?.trim();

  const where = busca ? 'WHERE nome LIKE ? OR cnpj LIKE ?' : '';
  const binds = busca ? [`%${busca}%`, `%${busca}%`] : [];

  const { results } = await env.DB
    .prepare(`SELECT * FROM clientes_negociacao ${where} ORDER BY nome`)
    .bind(...binds)
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/negociacao -> cria um cliente em negociação
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { nome?: string; cnpj?: string; telefone?: string; enquadramento_fiscal?: string; observacoes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare('INSERT INTO clientes_negociacao (nome, cnpj, telefone, enquadramento_fiscal, observacoes) VALUES (?, ?, ?, ?, ?)')
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.telefone?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      body.observacoes?.trim() || null
    )
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
