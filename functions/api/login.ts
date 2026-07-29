import { assinar } from './_middleware';

interface Env {
  SENHA_PAINEL: string;
  SEGREDO_SESSAO: string;
}

export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  let body: { senha?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Requisição inválida' }), { status: 400 });
  }

  if (!body.senha || body.senha !== env.SENHA_PAINEL) {
    return new Response(JSON.stringify({ erro: 'Senha incorreta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dado = 'painel-autenticado';
  const assinatura = await assinar(dado, env.SEGREDO_SESSAO);
  const token = `${dado}.${assinatura}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // 30 dias — pra ninguém precisar digitar a senha toda hora
      'Set-Cookie': `sessao=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
    },
  });
}
