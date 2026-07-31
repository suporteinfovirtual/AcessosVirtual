interface Env {
  DB: D1Database;
}

// GET /api/clientes/:id/certificado -> baixa o arquivo .pfx do cliente
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT nome_arquivo, arquivo FROM certificados WHERE cliente_id = ?')
    .bind(params.id)
    .first<{ nome_arquivo: string; arquivo: ArrayBuffer }>();

  if (!registro) {
    return new Response(JSON.stringify({ erro: 'Certificado não encontrado' }), { status: 404 });
  }

  return new Response(new Uint8Array(registro.arquivo), {
    headers: {
      'Content-Type': 'application/x-pkcs12',
      'Content-Disposition': `attachment; filename="${registro.nome_arquivo}"`,
      'Content-Length': String(registro.arquivo.byteLength),
    },
  });
}

// POST /api/clientes/:id/certificado -> envia (ou substitui) o certificado do cliente
// multipart/form-data: arquivo (.pfx), senha, validade (YYYY-MM-DD), nome_arquivo
export async function onRequestPost(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const arquivo = form.get('arquivo');
  const senha = form.get('senha');
  const validade = form.get('validade');
  const nomeArquivo = form.get('nome_arquivo');

  if (!(arquivo instanceof File)) {
    return new Response(JSON.stringify({ erro: 'Arquivo do certificado é obrigatório' }), { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();

  await env.DB
    .prepare(
      `INSERT INTO certificados (cliente_id, nome_arquivo, arquivo, senha, validade, atualizado_em)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(cliente_id) DO UPDATE SET
         nome_arquivo = excluded.nome_arquivo,
         arquivo = excluded.arquivo,
         senha = excluded.senha,
         validade = excluded.validade,
         atualizado_em = excluded.atualizado_em`
    )
    .bind(
      params.id,
      (nomeArquivo?.toString() || arquivo.name || 'certificado.pfx'),
      bytes,
      senha?.toString() || null,
      validade?.toString() || null
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
