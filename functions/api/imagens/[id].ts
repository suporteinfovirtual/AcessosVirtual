interface Env {
  DB: D1Database;
}

// GET /api/imagens/:id -> mostra uma imagem (print) de um passo do manual
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT imagem, imagem_tipo FROM manual_passo_imagens WHERE id = ?')
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

// DELETE /api/imagens/:id -> remove uma imagem especifica do passo
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM manual_passo_imagens WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
