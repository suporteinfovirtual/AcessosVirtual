interface Env {
  DB: D1Database;
}

// GET /api/wiki/:id -> o artigo com as imagens anexadas (sem os bytes, só se existem)
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const artigo = await env.DB.prepare('SELECT * FROM wiki_artigos WHERE id = ?').bind(params.id).first();
  if (!artigo) {
    return new Response(JSON.stringify({ erro: 'Artigo não encontrado' }), { status: 404 });
  }

  const { results: imagens } = await env.DB
    .prepare('SELECT id, artigo_id, ordem, imagem_nome FROM wiki_artigo_imagens WHERE artigo_id = ? ORDER BY ordem')
    .bind(params.id)
    .all();

  return new Response(JSON.stringify({ ...artigo, imagens }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/wiki/:id -> atualiza o artigo
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { titulo?: string; codigo?: string; mensagem_erro?: string; causa?: string; solucao?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.titulo?.trim()) {
    return new Response(JSON.stringify({ erro: 'Título é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare(
      `UPDATE wiki_artigos
       SET titulo = ?, codigo = ?, mensagem_erro = ?, causa = ?, solucao = ?, atualizado_em = datetime('now')
       WHERE id = ?`
    )
    .bind(
      body.titulo.trim(),
      body.codigo?.trim() || null,
      body.mensagem_erro?.trim() || null,
      body.causa?.trim() || null,
      body.solucao?.trim() || null,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/wiki/:id -> remove o artigo e as imagens dele (ON DELETE CASCADE)
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM wiki_artigos WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
