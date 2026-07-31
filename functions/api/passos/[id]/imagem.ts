interface Env {
  DB: D1Database;
}

// GET /api/passos/:id/imagem -> mostra a imagem (print) do passo
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT imagem, imagem_tipo FROM manual_passos WHERE id = ?')
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
