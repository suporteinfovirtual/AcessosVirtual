// Bindings e segredos do Worker, declarados num lugar só (vinham repetidos em cada rota).
// DB/BUCKET saem do wrangler.toml; os segredos, de `wrangler secret put`.
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  SENHA_PAINEL: string;
  SEGREDO_SESSAO: string;
  SENHA_PADRAO_ZETA?: string;
}

// Rota sem parâmetro na URL (ex.: /api/clientes).
export type Contexto = EventContext<Env, never, unknown>;

// Rota com :id na URL (ex.: /api/clientes/:id).
export type ContextoComId = EventContext<Env, 'id', unknown>;
