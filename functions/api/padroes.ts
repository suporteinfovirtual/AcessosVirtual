import type { Contexto } from './_lib/env';
import { json } from './_lib/http';

// GET /api/padroes -> valores padrão usados nos cadastros. A senha padrão do Zeta fica num
// secret do Cloudflare (wrangler secret put SENHA_PADRAO_ZETA), fora do código.
export async function onRequestGet({ env }: Contexto) {
  return json(
    { senha_padrao_zeta: env.SENHA_PADRAO_ZETA || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
