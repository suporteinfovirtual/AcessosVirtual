interface Env {
  DB: D1Database;
}

// PUT /api/passos/:id -> atualiza um passo (ordem/texto e opcionalmente substitui/remove imagem e arquivo)
// multipart/form-data: ordem, texto, imagem (opcional), arquivo (opcional), remover_imagem ('1'), remover_arquivo ('1')
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const ordem = Number(form.get('ordem') || 0);
  const texto = form.get('texto')?.toString() || null;
  const imagem = form.get('imagem');
  const arquivo = form.get('arquivo');
  const removerImagem = form.get('remover_imagem') === '1';
  const removerArquivo = form.get('remover_arquivo') === '1';

  const campos = ['ordem = ?', 'texto = ?'];
  const binds: unknown[] = [ordem, texto];

  if (imagem instanceof File && imagem.size > 0) {
    campos.push('imagem = ?', 'imagem_nome = ?', 'imagem_tipo = ?');
    binds.push(await imagem.arrayBuffer(), imagem.name, imagem.type || null);
  } else if (removerImagem) {
    campos.push('imagem = NULL', 'imagem_nome = NULL', 'imagem_tipo = NULL');
  }

  if (arquivo instanceof File && arquivo.size > 0) {
    campos.push('arquivo = ?', 'arquivo_nome = ?');
    binds.push(await arquivo.arrayBuffer(), arquivo.name);
  } else if (removerArquivo) {
    campos.push('arquivo = NULL', 'arquivo_nome = NULL');
  }

  binds.push(params.id);

  await env.DB
    .prepare(`UPDATE manual_passos SET ${campos.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/passos/:id -> remove o passo
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM manual_passos WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
