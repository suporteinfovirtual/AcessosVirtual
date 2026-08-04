interface Env {
  DB: D1Database;
}

// GET /api/clientes-sistemas/:id -> um cliente específico
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const cliente = await env.DB.prepare('SELECT * FROM clientes_sistemas WHERE id = ?').bind(params.id).first();
  if (!cliente) {
    return new Response(JSON.stringify({ erro: 'Cliente não encontrado' }), { status: 404 });
  }

  const { results: licencasSelecionadas } = await env.DB
    .prepare(
      `SELECT licencas.id, licencas.nome FROM clientes_sistemas_licencas
       JOIN licencas ON licencas.id = clientes_sistemas_licencas.licenca_id
       WHERE clientes_sistemas_licencas.cliente_sistema_id = ?`
    )
    .bind(params.id)
    .all();

  return new Response(JSON.stringify({ ...cliente, licencas_selecionadas: licencasSelecionadas }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/clientes-sistemas/:id -> atualiza os dados do cliente
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    nome?: string;
    cnpj?: string;
    telefone?: string;
    licencas?: string;
    enquadramento_fiscal?: string;
    versao_build?: string;
    observacoes?: string;
    licenca_ids?: number[];
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
      `UPDATE clientes_sistemas
       SET nome = ?, cnpj = ?, telefone = ?, licencas = ?, enquadramento_fiscal = ?, versao_build = ?, observacoes = ?
       WHERE id = ?`
    )
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.telefone?.trim() || null,
      body.licencas?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      body.versao_build?.trim() || null,
      body.observacoes?.trim() || null,
      params.id
    )
    .run();

  if (Array.isArray(body.licenca_ids)) {
    await env.DB.prepare('DELETE FROM clientes_sistemas_licencas WHERE cliente_sistema_id = ?').bind(params.id).run();
    for (const licencaId of body.licenca_ids) {
      await env.DB
        .prepare('INSERT INTO clientes_sistemas_licencas (cliente_sistema_id, licenca_id) VALUES (?, ?)')
        .bind(params.id, licencaId)
        .run();
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/clientes-sistemas/:id -> remove o cliente
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM clientes_sistemas WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
