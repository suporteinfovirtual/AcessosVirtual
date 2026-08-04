interface Env {
  DB: D1Database;
}

interface AcessoInput {
  tipo: 'anydesk' | 'acesso_web' | 'acesso_zeta';
  identificador?: string;
  usuario?: string;
  senha?: string;
  link?: string;
  servidor?: string;
  contabilidade_id?: number | null;
  enviar_contabilidade?: boolean;
  observacoes?: string;
}

// GET /api/clientes?busca=texto&categoria_id=1  -> lista clientes (com os acessos de cada um), filtrando por nome, cnpj e/ou categoria
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const busca = url.searchParams.get('busca')?.trim();
  const categoriaId = url.searchParams.get('categoria_id')?.trim();

  const condicoes: string[] = [];
  const binds: unknown[] = [];

  if (busca) {
    condicoes.push('(clientes.nome LIKE ? OR clientes.cnpj LIKE ?)');
    binds.push(`%${busca}%`, `%${busca}%`);
  }
  if (categoriaId) {
    condicoes.push('clientes.categoria_id = ?');
    binds.push(categoriaId);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const clientesQuery = env.DB.prepare(
    `SELECT clientes.*, categorias.nome AS categoria_nome FROM clientes LEFT JOIN categorias ON categorias.id = clientes.categoria_id ${where} ORDER BY clientes.nome`
  ).bind(...binds);

  const { results: clientes } = await clientesQuery.all();

  if (clientes.length === 0) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }

  const { results: acessos } = await env.DB
    .prepare(
      `SELECT acessos.*, contabilidades.nome AS contabilidade_nome, contabilidades.email AS contabilidade_email
       FROM acessos LEFT JOIN contabilidades ON contabilidades.id = acessos.contabilidade_id`
    )
    .all();

  const { results: certificados } = await env.DB
    .prepare('SELECT cliente_id, nome_arquivo, senha, validade, atualizado_em FROM certificados')
    .all();

  const { results: licencasVinculadas } = await env.DB
    .prepare(
      `SELECT cliente_licencas.cliente_id, licencas.id, licencas.nome
       FROM cliente_licencas JOIN licencas ON licencas.id = cliente_licencas.licenca_id`
    )
    .all();

  const clientesComAcessos = clientes.map((cliente: any) => ({
    ...cliente,
    acessos: acessos.filter((a: any) => a.cliente_id === cliente.id),
    certificado: certificados.find((c: any) => c.cliente_id === cliente.id) || null,
    licencas_selecionadas: licencasVinculadas
      .filter((l: any) => l.cliente_id === cliente.id)
      .map((l: any) => ({ id: l.id, nome: l.nome })),
  }));

  return new Response(JSON.stringify(clientesComAcessos), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/clientes -> cria um cliente novo, já com os acessos que vierem junto
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: {
    nome?: string;
    cnpj?: string;
    observacoes?: string;
    categoria_id?: number | null;
    licencas?: string;
    enquadramento_fiscal?: string;
    licenca_ids?: number[];
    acessos?: AcessoInput[];
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.nome?.trim()) {
    return new Response(JSON.stringify({ erro: 'Nome é obrigatório' }), { status: 400 });
  }

  const resultadoCliente = await env.DB
    .prepare(
      'INSERT INTO clientes (nome, cnpj, observacoes, categoria_id, licencas, enquadramento_fiscal) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(
      body.nome.trim(),
      body.cnpj?.trim() || null,
      body.observacoes?.trim() || null,
      body.categoria_id || null,
      body.licencas?.trim() || null,
      body.enquadramento_fiscal?.trim() || null
    )
    .run();

  const clienteId = resultadoCliente.meta.last_row_id;

  if (Array.isArray(body.licenca_ids)) {
    for (const licencaId of body.licenca_ids) {
      await env.DB.prepare('INSERT INTO cliente_licencas (cliente_id, licenca_id) VALUES (?, ?)').bind(clienteId, licencaId).run();
    }
  }

  if (Array.isArray(body.acessos)) {
    for (const acesso of body.acessos) {
      if (!acesso.tipo) continue;
      await env.DB
        .prepare(
          'INSERT INTO acessos (cliente_id, tipo, identificador, usuario, senha, link, servidor, contabilidade_id, enviar_contabilidade, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          clienteId,
          acesso.tipo,
          acesso.identificador || null,
          acesso.usuario || null,
          acesso.senha || null,
          acesso.link || null,
          acesso.servidor || null,
          acesso.contabilidade_id || null,
          acesso.enviar_contabilidade ? 1 : 0,
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
