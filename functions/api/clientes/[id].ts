interface Env {
  DB: D1Database;
}

// GET /api/clientes/:id -> um cliente com todos os acessos dele
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const cliente = await env.DB
    .prepare(
      'SELECT clientes.*, categorias.nome AS categoria_nome FROM clientes LEFT JOIN categorias ON categorias.id = clientes.categoria_id WHERE clientes.id = ?'
    )
    .bind(params.id)
    .first();
  if (!cliente) {
    return new Response(JSON.stringify({ erro: 'Cliente não encontrado' }), { status: 404 });
  }

  const { results: acessos } = await env.DB
    .prepare('SELECT * FROM acessos WHERE cliente_id = ?')
    .bind(params.id)
    .all();

  const certificado = await env.DB
    .prepare('SELECT nome_arquivo, senha, validade, atualizado_em FROM certificados WHERE cliente_id = ?')
    .bind(params.id)
    .first();

  return new Response(JSON.stringify({ ...cliente, acessos, certificado: certificado || null }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/clientes/:id -> atualiza nome, cnpj ou observações do cliente
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    nome?: string;
    cnpj?: string;
    observacoes?: string;
    categoria_id?: number | null;
    licencas?: string;
    enquadramento_fiscal?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare(
      'UPDATE clientes SET nome = ?, cnpj = ?, observacoes = ?, categoria_id = ?, licencas = ?, enquadramento_fiscal = ? WHERE id = ?'
    )
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.observacoes?.trim() || null,
      body.categoria_id || null,
      body.licencas?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/clientes/:id -> remove o cliente e os acessos dele (ON DELETE CASCADE cuida dos acessos)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM clientes WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
