interface Env {
  DB: D1Database;
}

// POST /api/wiki/:id/imagens -> adiciona mais uma imagem (print do erro) ao artigo
// multipart/form-data: imagem (arquivo)
export async function onRequestPost(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const imagem = form.get('imagem');

  if (!(imagem instanceof File) || imagem.size === 0) {
    return new Response(JSON.stringify({ erro: 'Imagem é obrigatória' }), { status: 400 });
  }

  const proximaOrdem = await env.DB
    .prepare('SELECT COALESCE(MAX(ordem), 0) + 1 AS ordem FROM wiki_artigo_imagens WHERE artigo_id = ?')
    .bind(params.id)
    .first<{ ordem: number }>();

  const bytes = await imagem.arrayBuffer();

  const resultado = await env.DB
    .prepare('INSERT INTO wiki_artigo_imagens (artigo_id, ordem, imagem, imagem_nome, imagem_tipo) VALUES (?, ?, ?, ?, ?)')
    .bind(params.id, proximaOrdem?.ordem || 1, bytes, imagem.name || null, imagem.type || null)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
