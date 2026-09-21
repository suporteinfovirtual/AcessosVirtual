import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import {
  dataIsoOpcional,
  flag,
  idDaRota,
  idOpcional,
  lerCorpo,
  textoOpcional,
} from '../_lib/validacao';

const Instalacao = z.object({
  telefone: textoOpcional,
  email: textoOpcional,
  aliquota: textoOpcional,
  tecnico_id: idOpcional('Técnico inválido'),
  data_instalacao: dataIsoOpcional('Data da instalação deve estar no formato AAAA-MM-DD'),
  instalado: flag,
  observacoes: textoOpcional,
});

// PUT /api/instalacoes/:id -> atualiza a instalação (WhatsApp, e-mail, alíquota, técnico, data, marcar instalado, observações)
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Instalacao);
  if (erro) return erro;

  await env.DB.prepare(
    `UPDATE instalacoes
       SET telefone = ?,
           email = ?,
           aliquota = ?,
           tecnico_id = ?,
           observacoes = ?,
           instalado = ?,
           data_instalacao = CASE WHEN ? = 1 THEN COALESCE(?, data_instalacao, date('now')) ELSE ? END,
           atualizado_em = datetime('now')
       WHERE id = ?`,
  )
    .bind(
      dados.telefone,
      dados.email,
      dados.aliquota,
      dados.tecnico_id,
      dados.observacoes,
      dados.instalado,
      dados.instalado,
      dados.data_instalacao,
      dados.data_instalacao,
      id,
    )
    .run();

  return ok();
}

// DELETE /api/instalacoes/:id -> remove a instalação e devolve a negociação de origem
// pro status "em negociação" (sem perder nome, cnpj, telefone etc já preenchidos nela)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const instalacao = await env.DB.prepare('SELECT negociacao_id FROM instalacoes WHERE id = ?')
    .bind(id)
    .first<{ negociacao_id: number | null }>();

  if (instalacao?.negociacao_id) {
    await env.DB.prepare(
      `UPDATE clientes_negociacao
         SET status = 'em_negociacao', convertido_em = NULL, atualizado_em = datetime('now')
         WHERE id = ?`,
    )
      .bind(instalacao.negociacao_id)
      .run();
  }

  await env.DB.prepare('DELETE FROM instalacoes WHERE id = ?').bind(id).run();
  return ok();
}
