interface Env {
  DB: D1Database;
}

// GET /api/wiki/imagens/:id -> mostra uma imagem (print) anexada a um artigo da wiki
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT imagem, imagem_tipo FROM wiki_artigo_imagens WHERE id = ?')
    .bind(params.id)
    .first<{ imagem: ArrayBuffer | null; imagem_tipo: string | null }>();

  if (!registro?.imagem) {
    return new Response(JSON.stringify({ erro: 'Imagem não encontrada' }), { status: 404 });
  }

  return new Response(new Uint8Array(registro.imagem), {
    headers: {
      'Content-Type': registro.imagem_tipo || 'application/octet-stream',
      'Content-Length': String(registro.imagem.byteLength),
    },
  });
}

// DELETE /api/wiki/imagens/:id -> remove uma imagem específica do artigo
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM wiki_artigo_imagens WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
