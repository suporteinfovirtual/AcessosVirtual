interface Env {
  DB: D1Database;
}

// GET /api/sincronizacao -> versão atual dos dados; muda sempre que alguém grava algo
export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { env } = context;
  let versao = 0;
  try {
    const linha = await env.DB.prepare('SELECT versao FROM sincronizacao WHERE id = 1').first<{ versao: number }>();
    versao = linha?.versao ?? 0;
  } catch {
    // tabela ainda não criada (migração 0039 pendente): segue sem sincronizar
  }
  return new Response(JSON.stringify({ versao }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
