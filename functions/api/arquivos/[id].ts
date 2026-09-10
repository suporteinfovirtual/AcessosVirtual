interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

// A função lê o upload inteiro na memória antes de subir pro R2; o isolate tem ~128 MB.
const LIMITE_BYTES = 25 * 1024 * 1024;

interface Registro {
  nome_arquivo: string;
  tipo: string | null;
  arquivo: ArrayBuffer | null;
  r2_key: string | null;
}

function nomeSeguro(nome: string): string {
  // Tira aspas e quebras de linha pra não furar o header Content-Disposition.
  return Array.from(nome, (c) => (c === '"' || c === '\r' || c === '\n' ? '_' : c)).join('');
}

// GET /api/arquivos/:id -> baixa o arquivo
export async function onRequestGet(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  const registro = await env.DB
    .prepare('SELECT nome_arquivo, tipo, arquivo, r2_key FROM arquivos WHERE id = ?')
    .bind(params.id)
    .first<Registro>();

  if (!registro) {
    return new Response(JSON.stringify({ erro: 'Arquivo não encontrado' }), { status: 404 });
  }

  const disposicao = `attachment; filename="${nomeSeguro(registro.nome_arquivo)}"`;
  const tipo = registro.tipo || 'application/octet-stream';

  // Arquivos novos vivem no R2; os antigos ainda têm o conteúdo no BLOB do D1.
  if (registro.r2_key) {
    const objeto = await env.BUCKET.get(registro.r2_key);
    if (!objeto) {
      return new Response(JSON.stringify({ erro: 'Arquivo não encontrado' }), { status: 404 });
    }
    return new Response(objeto.body, {
      headers: {
        'Content-Type': tipo,
        'Content-Disposition': disposicao,
        'Content-Length': String(objeto.size),
      },
    });
  }

  const bytes = registro.arquivo ?? new ArrayBuffer(0);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': tipo,
      'Content-Disposition': disposicao,
      'Content-Length': String(bytes.byteLength),
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

  if (arquivo.size > LIMITE_BYTES) {
    return new Response(JSON.stringify({ erro: 'Arquivo acima do limite de 25 MB' }), { status: 413 });
  }

  const registro = await env.DB
    .prepare('SELECT r2_key FROM arquivos WHERE id = ?')
    .bind(params.id)
    .first<{ r2_key: string | null }>();

  if (!registro) {
    return new Response(JSON.stringify({ erro: 'Arquivo não encontrado' }), { status: 404 });
  }

  // Reaproveita a chave existente; se a linha for legado (sem r2_key), cria uma nova.
  const chave = registro.r2_key || `arquivos/${crypto.randomUUID()}`;
  await env.BUCKET.put(chave, arquivo, {
    httpMetadata: { contentType: arquivo.type || 'application/octet-stream' },
  });

  await env.DB
    .prepare(
      `UPDATE arquivos SET nome_arquivo = ?, tipo = ?, tamanho = ?, arquivo = NULL, r2_key = ?, atualizado_em = datetime('now')
       WHERE id = ?`
    )
    .bind(arquivo.name, arquivo.type || null, arquivo.size, chave, params.id)
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

  const registro = await env.DB
    .prepare('SELECT r2_key FROM arquivos WHERE id = ?')
    .bind(params.id)
    .first<{ r2_key: string | null }>();

  if (registro?.r2_key) {
    await env.BUCKET.delete(registro.r2_key);
  }

  await env.DB.prepare('DELETE FROM arquivos WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
