interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

// A função lê o upload inteiro na memória antes de subir pro R2; o isolate tem ~128 MB.
const LIMITE_BYTES = 25 * 1024 * 1024;

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

  if (arquivo.size > LIMITE_BYTES) {
    return new Response(JSON.stringify({ erro: 'Arquivo acima do limite de 25 MB' }), { status: 413 });
  }

  // O conteúdo vai pro R2; o D1 guarda só os metadados e a chave do objeto.
  const chave = `arquivos/${crypto.randomUUID()}`;
  await env.BUCKET.put(chave, arquivo, {
    httpMetadata: { contentType: arquivo.type || 'application/octet-stream' },
  });

  const resultado = await env.DB
    .prepare('INSERT INTO arquivos (nome_arquivo, titulo, tipo, tamanho, r2_key) VALUES (?, ?, ?, ?, ?)')
    .bind(arquivo.name, titulo?.toString().trim() || null, arquivo.type || null, arquivo.size, chave)
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
