interface Env {
  DB: D1Database;
}

// GET /api/arquivos/:id -> baixa o arquivo
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT nome_arquivo, tipo, arquivo FROM arquivos WHERE id = ?')
    .bind(params.id)
    .first<{ nome_arquivo: string; tipo: string | null; arquivo: ArrayBuffer }>();

  if (!registro) {
    return new Response(JSON.stringify({ erro: 'Arquivo não encontrado' }), { status: 404 });
  }

  return new Response(new Uint8Array(registro.arquivo), {
    headers: {
      'Content-Type': registro.tipo || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${registro.nome_arquivo}"`,
      'Content-Length': String(registro.arquivo.byteLength),
    },
  });
}

// PUT /api/arquivos/:id -> substitui o conteúdo do arquivo
// multipart/form-data: arquivo
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const arquivo = form.get('arquivo');

  if (!(arquivo instanceof File)) {
    return new Response(JSON.stringify({ erro: 'Arquivo é obrigatório' }), { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();

  await env.DB
    .prepare(
      `UPDATE arquivos SET nome_arquivo = ?, tipo = ?, tamanho = ?, arquivo = ?, atualizado_em = datetime('now')
       WHERE id = ?`
    )
    .bind(arquivo.name, arquivo.type || null, bytes.byteLength, bytes, params.id)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// PATCH /api/arquivos/:id -> renomeia o titulo amigável (sem mexer no arquivo)
// json: { titulo: string | null }
export async function onRequestPatch(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: { titulo?: string | null };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  await env.DB
    .prepare(`UPDATE arquivos SET titulo = ?, atualizado_em = datetime('now') WHERE id = ?`)
    .bind(body.titulo?.trim() || null, params.id)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/arquivos/:id -> remove o arquivo
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM arquivos WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
