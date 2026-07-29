interface Env {
  DB: D1Database;
}

interface AcessoInput {
  tipo: 'anydesk' | 'acesso_web' | 'acesso_zeta';
  identificador?: string;
  usuario?: string;
  senha?: string;
  link?: string;
  observacoes?: string;
}

// GET /api/clientes?busca=texto  -> lista clientes (com os acessos de cada um), filtrando por nome ou cnpj
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const busca = url.searchParams.get('busca')?.trim();

  const clientesQuery = busca
    ? env.DB.prepare('SELECT * FROM clientes WHERE nome LIKE ?1 OR cnpj LIKE ?1 ORDER BY nome').bind(`%${busca}%`)
    : env.DB.prepare('SELECT * FROM clientes ORDER BY nome');

  const { results: clientes } = await clientesQuery.all();

  if (clientes.length === 0) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  const { results: acessos } = await env.DB.prepare('SELECT * FROM acessos').all();

  const clientesComAcessos = clientes.map((cliente: any) => ({
    ...cliente,
    acessos: acessos.filter((a: any) => a.cliente_id === cliente.id),
  }));

  return new Response(JSON.stringify(clientesComAcessos), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/clientes -> cria um cliente novo, já com os acessos que vierem junto
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { nome?: string; cnpj?: string; observacoes?: string; acessos?: AcessoInput[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  const resultadoCliente = await env.DB
    .prepare('INSERT INTO clientes (nome, cnpj, observacoes) VALUES (?, ?, ?)')
    .bind(body.nome.trim(), body.cnpj?.trim() || null, body.observacoes?.trim() || null)
    .run();

  const clienteId = resultadoCliente.meta.last_row_id;

  if (Array.isArray(body.acessos)) {
    for (const acesso of body.acessos) {
      if (!acesso.tipo) continue;
      await env.DB
        .prepare(
          'INSERT INTO acessos (cliente_id, tipo, identificador, usuario, senha, link, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          clienteId,
          acesso.tipo,
          acesso.identificador || null,
          acesso.usuario || null,
          acesso.senha || null,
          acesso.link || null,
          acesso.observacoes || null
        )
        .run();
    }
  }

  return new Response(JSON.stringify({ id: clienteId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
