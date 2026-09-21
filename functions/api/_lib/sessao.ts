// Cookie de sessão assinado com HMAC-SHA256. Ficava dentro do _middleware.ts, que o
// login.ts importava só pra pegar o assinar().

const NOME_COOKIE = 'sessao';
const DADO_SESSAO = 'painel-autenticado';
// 30 dias — pra ninguém precisar digitar a senha toda hora
const DURACAO_SEGUNDOS = 2592000;

async function assinar(dado: string, segredo: string): Promise<string> {
  const encoder = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, encoder.encode(dado));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extrairCookie(cookieHeader: string, nome: string): string | null {
  for (const parte of cookieHeader.split(';')) {
    const [chave, valor] = parte.trim().split('=');
    if (chave === nome) return valor ?? null;
  }
  return null;
}

// Confere o cookie de sessão da requisição.
export async function sessaoValida(request: Request, segredo: string): Promise<boolean> {
  const token = extrairCookie(request.headers.get('Cookie') || '', NOME_COOKIE);
  if (!token) return false;

  const [dado, assinatura] = token.split('.');
  if (dado !== DADO_SESSAO || !assinatura) return false;

  return assinatura === (await assinar(dado, segredo));
}

// Valor pronto pro header Set-Cookie depois de um login aceito.
export async function cookieDeSessao(segredo: string): Promise<string> {
  const token = `${DADO_SESSAO}.${await assinar(DADO_SESSAO, segredo)}`;
  return `${NOME_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DURACAO_SEGUNDOS}`;
}
