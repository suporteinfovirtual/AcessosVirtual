interface Env {
  DB: D1Database;
  SENHA_PAINEL: string;
  SEGREDO_SESSAO: string;
}

// Roda antes de qualquer requisição para /api/*. Deixa passar só /api/login sem sessão válida.
export async function onRequest(context: EventContext<Env, string, unknown>) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/login') {
    return next();
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const token = extrairCookie(cookieHeader, 'sessao');

  if (!token || !(await tokenValido(token, env.SEGREDO_SESSAO))) {
    return new Response(JSON.stringify({ erro: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return next();
}

function extrairCookie(cookieHeader: string, nome: string): string | null {
  const partes = cookieHeader.split(';').map((p) => p.trim());
  for (const parte of partes) {
    const [chave, valor] = parte.split('=');
    if (chave === nome) return valor;
  }
  return null;
}

export async function tokenValido(token: string, segredo: string): Promise<boolean> {
  const [dado, assinaturaHex] = token.split('.');
  if (dado !== 'painel-autenticado' || !assinaturaHex) return false;

  const assinaturaEsperada = await assinar(dado, segredo);
  return assinaturaHex === assinaturaEsperada;
}

export async function assinar(dado: string, segredo: string): Promise<string> {
  const encoder = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, encoder.encode(dado));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
