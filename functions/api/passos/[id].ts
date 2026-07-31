interface Env {
  DB: D1Database;
}

// PUT /api/passos/:id -> atualiza um passo (ordem/texto e opcionalmente substitui/remove o arquivo)
// multipart/form-data: ordem, texto, arquivo (opcional), remover_arquivo ('1')
// (imagens são geridas à parte em /api/passos/:id/imagens e /api/imagens/:id)
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  const form = await request.formData();
  const ordem = Number(form.get('ordem') || 0);
  const texto = form.get('texto')?.toString() || null;
  const arquivo = form.get('arquivo');
  const removerArquivo = form.get('remover_arquivo') === '1';

  const campos = ['ordem = ?', 'texto = ?'];
  const binds: unknown[] = [ordem, texto];

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
