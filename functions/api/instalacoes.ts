interface Env {
  DB: D1Database;
}

const SISTEMAS_VALIDOS = ['uniplus', 'uniplus_web', 'sgbr', 'zeta'];

// GET /api/instalacoes -> lista as instalações (com o nome do técnico que instalou).
// Filtros: ?status=a_instalar | instalado
//          ?pendente_agendamento=1 -> só as já instaladas que ainda não têm treinamento
//                                     agendado (nenhuma linha em implantacoes pro mesmo cliente)
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status')?.trim();
  const pendenteAgendamento = url.searchParams.get('pendente_agendamento') === '1';

  const condicoes: string[] = [];

  if (status === 'a_instalar') condicoes.push('instalacoes.instalado = 0');
  if (status === 'instalado') condicoes.push('instalacoes.instalado = 1');

  if (pendenteAgendamento) {
    condicoes.push('instalacoes.instalado = 1');
    condicoes.push(
      `NOT EXISTS (
         SELECT 1 FROM implantacoes
         WHERE implantacoes.cliente_sistema = instalacoes.cliente_sistema
           AND implantacoes.cliente_ref_id = instalacoes.cliente_ref_id
       )`
    );
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { results } = await env.DB
    .prepare(
      `SELECT instalacoes.*, tecnicos.nome AS tecnico_nome
       FROM instalacoes LEFT JOIN tecnicos ON tecnicos.id = instalacoes.tecnico_id
       ${where}
       ORDER BY instalacoes.instalado, COALESCE(instalacoes.data_instalacao, instalacoes.criado_em) DESC, instalacoes.cliente_nome`
    )
    .all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/instalacoes -> cria uma instalação a partir da conversão de uma negociação fechada
export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: {
    cliente_sistema?: string;
    cliente_ref_id?: number;
    cliente_nome?: string;
    cnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
    enquadramento_fiscal?: string | null;
    precisa_migrar_base?: boolean;
    negociacao_id?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.cliente_nome?.trim() || !body.cliente_sistema || !body.cliente_ref_id) {
    return new Response(JSON.stringify({ erro: 'Cliente é obrigatório' }), { status: 400 });
  }
  if (!SISTEMAS_VALIDOS.includes(body.cliente_sistema)) {
    return new Response(JSON.stringify({ erro: 'Sistema inválido' }), { status: 400 });
  }

  const resultado = await env.DB
    .prepare(
      `INSERT INTO instalacoes
         (cliente_sistema, cliente_ref_id, cliente_nome, cnpj, telefone, email, enquadramento_fiscal, precisa_migrar_base, negociacao_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      body.cliente_sistema,
      body.cliente_ref_id,
      body.cliente_nome.trim(),
      body.cnpj?.toString().trim() || null,
      body.telefone?.toString().trim() || null,
      body.email?.toString().trim() || null,
      body.enquadramento_fiscal?.toString().trim() || null,
      body.precisa_migrar_base ? 1 : 0,
      body.negociacao_id || null
    )
    .run();

  return new Response(JSON.stringify({ id: resultado.meta.last_row_id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
