interface Env {
  SENHA_PADRAO_ZETA?: string;
}

// GET /api/padroes -> valores padrão usados nos cadastros. A senha padrão do Zeta fica num
// secret do Cloudflare (wrangler secret put SENHA_PADRAO_ZETA), fora do código.
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  return new Response(JSON.stringify({ senha_padrao_zeta: env.SENHA_PADRAO_ZETA || null }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
