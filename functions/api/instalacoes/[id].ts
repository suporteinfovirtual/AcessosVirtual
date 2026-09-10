interface Env {
  DB: D1Database;
}

// PUT /api/instalacoes/:id -> atualiza a instalação (WhatsApp, técnico, data, marcar instalado, observações)
export async function onRequestPut(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    telefone?: string | null;
    tecnico_id?: number | null;
    data_instalacao?: string | null;
    instalado?: boolean;
    observacoes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  const instalado = body.instalado ? 1 : 0;
  const dataInformada = body.data_instalacao?.toString().trim() || null;

  await env.DB
    .prepare(
      `UPDATE instalacoes
       SET telefone = ?,
           tecnico_id = ?,
           observacoes = ?,
           instalado = ?,
           data_instalacao = CASE WHEN ? = 1 THEN COALESCE(?, data_instalacao, date('now')) ELSE ? END,
           atualizado_em = datetime('now')
       WHERE id = ?`
    )
    .bind(
      body.telefone?.toString().trim() || null,
      body.tecnico_id || null,
      body.observacoes?.toString().trim() || null,
      instalado,
      instalado,
      dataInformada,
      dataInformada,
      params.id
    )
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

// DELETE /api/instalacoes/:id -> remove a instalação
export async function onRequestDelete(context: EventContext<Env, { id: string }, unknown>) {
  const { env, params } = context;

  await env.DB.prepare('DELETE FROM instalacoes WHERE id = ?').bind(params.id).run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
