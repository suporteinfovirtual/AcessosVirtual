interface Env {
  DB: D1Database;
}

// GET /api/envios-contabilidade?ano=2026&mes=8 -> status de envio de cada acesso naquele mes
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ano = Number(url.searchParams.get('ano'));
  const mes = Number(url.searchParams.get('mes'));

  if (!ano || !mes || mes < 1 || mes > 12) {
    return new Response(JSON.stringify({ erro: 'Parâmetros ano/mes inválidos' }), { status: 400 });
  }

  const { results } = await env.DB
    .prepare('SELECT acesso_id, enviado FROM envios_contabilidade_mensal WHERE ano = ? AND mes = ?')
    .bind(ano, mes)
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// PUT /api/envios-contabilidade -> marca/desmarca o envio de um acesso num mes/ano
export async function onRequestPut(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { acesso_id?: number; ano?: number; mes?: number; enviado?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  const { acesso_id, ano, mes, enviado } = body;
  if (!acesso_id || !ano || !mes || mes < 1 || mes > 12) {
    return new Response(JSON.stringify({ erro: 'Parâmetros inválidos' }), { status: 400 });
  }

  await env.DB
    .prepare(
      `INSERT INTO envios_contabilidade_mensal (acesso_id, ano, mes, enviado, atualizado_em)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT (acesso_id, ano, mes) DO UPDATE SET enviado = excluded.enviado, atualizado_em = excluded.atualizado_em`
    )
    .bind(acesso_id, ano, mes, enviado ? 1 : 0)
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
