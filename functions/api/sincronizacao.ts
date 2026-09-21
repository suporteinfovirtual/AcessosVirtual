import type { Contexto } from './_lib/env';
import { json } from './_lib/http';

// GET /api/sincronizacao -> versão atual dos dados; muda sempre que alguém grava algo
export async function onRequestGet({ env }: Contexto) {
  let versao = 0;
  try {
    const linha = await env.DB.prepare('SELECT versao FROM sincronizacao WHERE id = 1').first<{
      versao: number;
    }>();
    versao = linha?.versao ?? 0;
  } catch {
    // tabela ainda não criada (migração 0039 pendente): segue sem sincronizar
  }
  return json({ versao }, { headers: { 'Cache-Control': 'no-store' } });
}
