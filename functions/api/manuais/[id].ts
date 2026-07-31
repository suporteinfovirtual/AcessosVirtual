interface Env {
  DB: D1Database;
}

// GET /api/manuais/:id -> o manual com todos os passos (sem os bytes de imagem/arquivo, só se eles existem)
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const manual = await env.DB.prepare('SELECT * FROM manuais WHERE id = ?').bind(params.id).first();
  if (!manual) {
    return new Response(JSON.stringify({ erro: 'Manual não encontrado' }), { status: 404 });
  }

  const { results: passos } = await env.DB
    .prepare('SELECT id, manual_id, ordem, texto, arquivo_nome, criado_em FROM manual_passos WHERE manual_id = ? ORDER BY ordem')
    .bind(params.id)
    .all();

  const { results: imagens } = await env.DB
    .prepare(
      `SELECT manual_passo_imagens.id, manual_passo_imagens.passo_id, manual_passo_imagens.ordem, manual_passo_imagens.imagem_nome
       FROM manual_passo_imagens
       JOIN manual_passos ON manual_passos.id = manual_passo_imagens.passo_id
       WHERE manual_passos.manual_id = ?
       ORDER BY manual_passo_imagens.ordem`
    )
    .bind(params.id)
    .all();

  const passosComImagens = passos.map((passo: any) => ({
    ...passo,
    imagens: imagens.filter((img: any) => img.passo_id === passo.id),
  }));

  return new Response(JSON.stringify({ ...manual, passos: passosComImagens }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/manuais/:id -> atualiza titulo/descricao do manual
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { titulo?: string; descricao?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.titulo?.trim()) {
    return new Response(JSON.stringify({ erro: 'Título é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare('UPDATE manuais SET titulo = ?, descricao = ? WHERE id = ?')
    .bind(body.titulo.trim(), body.descricao?.trim() || null, params.id)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/manuais/:id -> remove o manual e os passos dele (ON DELETE CASCADE)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM manuais WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
