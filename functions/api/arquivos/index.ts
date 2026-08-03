interface Env {
  DB: D1Database;
}

// GET /api/arquivos -> lista os arquivos (metadados, sem os bytes)
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;

  const { results } = await env.DB
    .prepare('SELECT id, nome_arquivo, titulo, tipo, tamanho, criado_em, atualizado_em FROM arquivos ORDER BY COALESCE(titulo, nome_arquivo)')
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/arquivos -> envia um arquivo novo
// multipart/form-data: arquivo, titulo (opcional)
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  const form = await request.formData();
  const arquivo = form.get('arquivo');
  const titulo = form.get('titulo');

  if (!(arquivo instanceof File)) {
    return new Response(JSON.stringify({ erro: 'Arquivo é obrigatório' }), { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();

  const resultado = await env.DB
    .prepare('INSERT INTO arquivos (nome_arquivo, titulo, tipo, tamanho, arquivo) VALUES (?, ?, ?, ?, ?)')
    .bind(arquivo.name, titulo?.toString().trim() || null, arquivo.type || null, bytes.byteLength, bytes)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
