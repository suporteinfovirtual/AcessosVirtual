import type { ContextoComId } from '../_lib/env';
import { json, naoEncontrado, ok } from '../_lib/http';
import { Manual } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

interface PassoImagem {
  id: number;
  passo_id: number;
  ordem: number;
  imagem_nome: string | null;
}

// GET /api/manuais/:id -> o manual com todos os passos (sem os bytes de imagem/arquivo, só se eles existem)
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const manual = await env.DB.prepare('SELECT * FROM manuais WHERE id = ?').bind(id).first();
  if (!manual) return naoEncontrado('Manual não encontrado');

  const { results: passos } = await env.DB.prepare(
    'SELECT id, manual_id, ordem, texto, arquivo_nome, criado_em FROM manual_passos WHERE manual_id = ? ORDER BY ordem',
  )
    .bind(id)
    .all<{ id: number }>();

  const { results: imagens } = await env.DB.prepare(
    `SELECT manual_passo_imagens.id, manual_passo_imagens.passo_id, manual_passo_imagens.ordem, manual_passo_imagens.imagem_nome
       FROM manual_passo_imagens
       JOIN manual_passos ON manual_passos.id = manual_passo_imagens.passo_id
       WHERE manual_passos.manual_id = ?
       ORDER BY manual_passo_imagens.ordem`,
  )
    .bind(id)
    .all<PassoImagem>();

  const passosComImagens = passos.map((passo) => ({
    ...passo,
    imagens: imagens.filter((imagem) => imagem.passo_id === passo.id),
  }));

  return json({ ...manual, passos: passosComImagens });
}

// PUT /api/manuais/:id -> atualiza titulo/descricao do manual
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Manual);
  if (erro) return erro;

  await env.DB.prepare('UPDATE manuais SET titulo = ?, descricao = ? WHERE id = ?')
    .bind(dados.titulo, dados.descricao, id)
    .run();

  return ok();
}

// DELETE /api/manuais/:id -> remove o manual e os passos dele (ON DELETE CASCADE)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM manuais WHERE id = ?').bind(id).run();
  return ok();
}
