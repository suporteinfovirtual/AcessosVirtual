interface Env {
  DB: D1Database;
}

// zeta e uniplus_web não entram aqui - usam direto a tabela clientes/acessos (unificados com Acesso Zeta / Acesso Web)
const SISTEMAS = ['uniplus', 'sgbr'];

// GET /api/clientes-sistemas?sistema=uniplus&busca=texto -> lista os clientes de um sistema
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sistema = url.searchParams.get('sistema')?.trim();
  const busca = url.searchParams.get('busca')?.trim();

  const condicoes: string[] = [];
  const binds: unknown[] = [];

  if (sistema && SISTEMAS.includes(sistema)) {
    condicoes.push('sistema = ?');
    binds.push(sistema);
  }
  if (busca) {
    condicoes.push('(nome LIKE ? OR cnpj LIKE ?)');
    binds.push(`%${busca}%`, `%${busca}%`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const { results } = await env.DB
    .prepare(`SELECT * FROM clientes_sistemas ${where} ORDER BY nome`)
    .bind(...binds)
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/clientes-sistemas -> cria um cliente num dos sistemas
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: {
    sistema?: string;
    nome?: string;
    cnpj?: string;
    licencas?: string;
    enquadramento_fiscal?: string;
    versao_build?: string;
    observacoes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.sistema || !SISTEMAS.includes(body.sistema)) {
    return new Response(JSON.stringify({ erro: 'Sistema inválido' }), { status: 400 });
  }
  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare(
      `INSERT INTO clientes_sistemas (sistema, nome, cnpj, licencas, enquadramento_fiscal, versao_build, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      body.sistema,
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.licencas?.trim() || null,
      body.enquadramento_fiscal?.trim() || null,
      body.versao_build?.trim() || null,
      body.observacoes?.trim() || null
    )
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
