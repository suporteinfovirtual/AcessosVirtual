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
  const { results: clientes } = await env.DB
    .prepare(`SELECT * FROM clientes_sistemas ${where} ORDER BY nome`)
    .bind(...binds)
    .all();

  if (clientes.length === 0) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  const { results: licencasVinculadas } = await env.DB
    .prepare(
      `SELECT clientes_sistemas_licencas.cliente_sistema_id, licencas.id, licencas.nome
       FROM clientes_sistemas_licencas JOIN licencas ON licencas.id = clientes_sistemas_licencas.licenca_id`
    )
    .all();

  const clientesComLicencas = clientes.map((cliente: any) => ({
    ...cliente,
    licencas_selecionadas: licencasVinculadas
      .filter((l: any) => l.cliente_sistema_id === cliente.id)
      .map((l: any) => ({ id: l.id, nome: l.nome })),
  }));

  return new Response(JSON.stringify(clientesComLicencas), { headers: { 'Content-Type': 'application/json' } });
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
    licenca_ids?: number[];
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

  const clienteSistemaId = resultado.meta.last_row_id;

  if (Array.isArray(body.licenca_ids)) {
    for (const licencaId of body.licenca_ids) {
      await env.DB
        .prepare('INSERT INTO clientes_sistemas_licencas (cliente_sistema_id, licenca_id) VALUES (?, ?)')
        .bind(clienteSistemaId, licencaId)
        .run();
    }
  }

  return new Response(JSON.stringify({ id: clienteSistemaId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
