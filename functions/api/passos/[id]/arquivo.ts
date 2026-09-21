import type { ContextoComId } from '../../_lib/env';
import { download, naoEncontrado } from '../../_lib/http';
import type { CorpoBinario } from '../../_lib/http';
import { idDaRota } from '../../_lib/validacao';

// GET /api/passos/:id/arquivo -> baixa o arquivo anexado ao passo
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const registro = await env.DB.prepare(
    'SELECT arquivo, arquivo_nome FROM manual_passos WHERE id = ?',
  )
    .bind(id)
    .first<{ arquivo: CorpoBinario | null; arquivo_nome: string | null }>();

  if (!registro?.arquivo) return naoEncontrado('Arquivo não encontrado');

  return download(registro.arquivo, {
    nome: registro.arquivo_nome || 'arquivo',
  });
}
