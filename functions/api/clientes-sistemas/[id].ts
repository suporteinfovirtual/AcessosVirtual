import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { json, naoEncontrado, ok } from '../_lib/http';
import { camposDeClienteSistema } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

const ClienteSistema = z.object(camposDeClienteSistema);

// GET /api/clientes-sistemas/:id -> um cliente específico
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const cliente = await env.DB.prepare(
    `SELECT clientes_sistemas.*, categorias.nome AS categoria_nome
       FROM clientes_sistemas LEFT JOIN categorias ON categorias.id = clientes_sistemas.categoria_id
       WHERE clientes_sistemas.id = ?`,
  )
    .bind(id)
    .first();

  if (!cliente) return naoEncontrado('Cliente não encontrado');

  const { results: licencasSelecionadas } = await env.DB.prepare(
    `SELECT licencas.id, licencas.nome FROM clientes_sistemas_licencas
       JOIN licencas ON licencas.id = clientes_sistemas_licencas.licenca_id
       WHERE clientes_sistemas_licencas.cliente_sistema_id = ?`,
  )
    .bind(id)
    .all();

  const certificado = await env.DB.prepare(
    'SELECT nome_arquivo, senha, validade, atualizado_em FROM certificados_sistemas WHERE cliente_sistema_id = ?',
  )
    .bind(id)
    .first();

  return json({
    ...cliente,
    licencas_selecionadas: licencasSelecionadas,
    certificado: certificado || null,
  });
}

// PUT /api/clientes-sistemas/:id -> atualiza os dados do cliente
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, ClienteSistema);
  if (erro) return erro;

  await env.DB.prepare(
    `UPDATE clientes_sistemas
       SET nome = ?, cnpj = ?, telefone = ?, licencas = ?, enquadramento_fiscal = ?, versao_build = ?, observacoes = ?, custo_mensalidade = ?, valor_mensalidade = ?, categoria_id = ?
       WHERE id = ?`,
  )
    .bind(
      dados.nome,
      dados.cnpj,
      dados.telefone,
      dados.licencas,
      dados.enquadramento_fiscal,
      dados.versao_build,
      dados.observacoes,
      dados.custo_mensalidade,
      dados.valor_mensalidade,
      dados.categoria_id,
      id,
    )
    .run();

  // licenca_ids ausente = a tela não mexeu nas licenças; presente = troca a lista inteira
  if (dados.licenca_ids) {
    await env.DB.prepare('DELETE FROM clientes_sistemas_licencas WHERE cliente_sistema_id = ?')
      .bind(id)
      .run();
    for (const licencaId of dados.licenca_ids) {
      await env.DB.prepare(
        'INSERT INTO clientes_sistemas_licencas (cliente_sistema_id, licenca_id) VALUES (?, ?)',
      )
        .bind(id, licencaId)
        .run();
    }
  }

  return ok();
}

// DELETE /api/clientes-sistemas/:id -> remove o cliente
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM clientes_sistemas WHERE id = ?').bind(id).run();
  return ok();
}
