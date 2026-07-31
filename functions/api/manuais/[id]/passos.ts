interface Env {
  DB: D1Database;
}

// POST /api/manuais/:id/passos -> adiciona um passo ao manual
// multipart/form-data: ordem, texto, arquivo (opcional). Imagens são adicionadas depois, via /api/passos/:id/imagens
export async function onRequestPost(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const ordem = Number(form.get('ordem') || 0);
  const texto = form.get('texto')?.toString() || null;
  const arquivo = form.get('arquivo');

  const arquivoBytes = arquivo instanceof File && arquivo.size > 0 ? await arquivo.arrayBuffer() : null;

  const resultado = await env.DB
    .prepare(`INSERT INTO manual_passos (manual_id, ordem, texto, arquivo, arquivo_nome) VALUES (?, ?, ?, ?, ?)`)
    .bind(params.id, ordem, texto, arquivoBytes, arquivoBytes ? (arquivo as File).name : null)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
