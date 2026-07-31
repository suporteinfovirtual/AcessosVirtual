interface Env {
  DB: D1Database;
}

// GET /api/passos/:id/arquivo -> baixa o arquivo anexado ao passo
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT arquivo, arquivo_nome FROM manual_passos WHERE id = ?')
    .bind(params.id)
    .first<{ arquivo: ArrayBuffer | null; arquivo_nome: string | null }>();

  if (!registro?.arquivo) {
    return new Response(JSON.stringify({ erro: 'Arquivo não encontrado' }), { status: 404 });
  }

  return new Response(new Uint8Array(registro.arquivo), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${registro.arquivo_nome || 'arquivo'}"`,
      'Content-Length': String(registro.arquivo.byteLength),
    },
  });
}
