interface Env {
  DB: D1Database;
}

// POST /api/clientes/:id/acessos -> adiciona um novo acesso (anydesk/acesso_web/acesso_zeta) a um cliente existente
export async function onRequestPost(context: EventContext<Env, { id: string }, unknown>) {
  const { request, env, params } = context;

  let body: {
    tipo?: 'anydesk' | 'acesso_web' | 'acesso_zeta';
    identificador?: string;
    usuario?: string;
    senha?: string;
    link?: string;
    servidor?: string;
    contabilidade?: string;
    observacoes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.tipo || !['anydesk', 'acesso_web', 'acesso_zeta'].includes(body.tipo)) {
    return new Response(JSON.stringify({ erro: 'Tipo de acesso inválido' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare(
      'INSERT INTO acessos (cliente_id, tipo, identificador, usuario, senha, link, servidor, contabilidade, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      params.id,
      body.tipo,
      body.identificador || null,
      body.usuario || null,
      body.senha || null,
      body.link || null,
      body.servidor || null,
      body.contabilidade || null,
      body.observacoes || null
    )
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
