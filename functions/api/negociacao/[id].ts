interface Env {
  DB: D1Database;
}

const STATUS_VALIDOS = ['em_negociacao', 'desistiu', 'fechou'];
const SISTEMAS_VALIDOS = ['uniplus', 'uniplus_web', 'sgbr', 'zeta'];

// PUT /api/negociacao/:id -> atualiza um cliente em negociação (status, sistema e conversão)
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    nome?: string;
    cnpj?: string;
    telefone?: string;
    enquadramento_fiscal?: string;
    observacoes?: string;
    status?: string;
    sistema?: string;
    precisa_migrar_base?: boolean;
    motivo_desistencia?: string;
    convertido?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  if (body.status && !STATUS_VALIDOS.includes(body.status)) {
    return new Response(JSON.stringify({ erro: 'Status inválido' }), { status: 400 });
  }

  if (body.sistema && !SISTEMAS_VALIDOS.includes(body.sistema)) {
    return new Response(JSON.stringify({ erro: 'Sistema inválido' }), { status: 400 });
  }

  // convertido_em só é escrito quando convertido=true vem no corpo (marca "agora" no
  // servidor); nos demais salvamentos o valor que já estava gravado é preservado.
  await env.DB
    .prepare(
      `UPDATE clientes_negociacao
       SET nome = ?, cnpj = ?, telefone = ?, enquadramento_fiscal = ?, observacoes = ?,
           precisa_migrar_base = ?, motivo_desistencia = ?, status = COALESCE(?, status), sistema = COALESCE(?, sistema),
           convertido_em = CASE WHEN ? = 1 THEN datetime('now') ELSE convertido_em END,
           atualizado_em = datetime('now')
       WHERE id = ?`
    )
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.telefone?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      body.observacoes?.trim() || null,
      body.precisa_migrar_base ? 1 : 0,
      body.motivo_desistencia?.trim() || null,
      body.status || null,
      body.sistema || null,
      body.convertido ? 1 : 0,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/negociacao/:id -> remove um cliente em negociação
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM clientes_negociacao WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
