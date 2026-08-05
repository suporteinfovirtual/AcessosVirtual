interface Env {
  DB: D1Database;
}

// GET /api/faturamento?filtro=pendentes|faturados
// pendentes (padrão): clientes com implantação concluída e sem nenhuma pendente no
// futuro, que ainda não foram marcados como faturados
// faturados: clientes já marcados, com a data em que foram faturados
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filtro = url.searchParams.get('filtro') === 'faturados' ? 'faturados' : 'pendentes';

  const { results: faturados } = await env.DB
    .prepare('SELECT * FROM faturamento_clientes ORDER BY faturado_em DESC')
    .all();

  if (filtro === 'faturados') {
    return new Response(JSON.stringify(faturados), { headers: { 'Content-Type': 'application/json' } });
  }

  const { results: prontos } = await env.DB
    .prepare(
      `SELECT cliente_sistema, cliente_ref_id, MAX(cliente_nome) as cliente_nome
       FROM implantacoes
       GROUP BY cliente_sistema, cliente_ref_id
       HAVING
         MAX(CASE WHEN concluida_manual = 1 OR data < date('now') THEN 1 ELSE 0 END) = 1
         AND MAX(CASE WHEN concluida_manual = 0 AND data >= date('now') THEN 1 ELSE 0 END) = 0
       ORDER BY cliente_nome`
    )
    .all();

  const jaFaturados = new Set((faturados as any[]).map((f) => `${f.cliente_sistema}:${f.cliente_ref_id}`));
  const pendentes = (prontos as any[]).filter((p) => !jaFaturados.has(`${p.cliente_sistema}:${p.cliente_ref_id}`));

  return new Response(JSON.stringify(pendentes), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/faturamento -> marca um cliente como faturado
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { cliente_sistema?: string; cliente_ref_id?: number; cliente_nome?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.cliente_sistema || !body.cliente_ref_id || !body.cliente_nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Cliente é obrigatório' }), { status: 400 });
  }

  await env.DB
    .prepare(
      `INSERT INTO faturamento_clientes (cliente_sistema, cliente_ref_id, cliente_nome)
       VALUES (?, ?, ?)
       ON CONFLICT(cliente_sistema, cliente_ref_id) DO UPDATE SET
         cliente_nome = excluded.cliente_nome, faturado_em = datetime('now')`
    )
    .bind(body.cliente_sistema, body.cliente_ref_id, body.cliente_nome.trim())
    .run();

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
