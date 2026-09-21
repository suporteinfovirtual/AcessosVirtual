import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { json, naoEncontrado, ok } from '../_lib/http';
import { camposDeCliente } from '../_lib/schemas';
import { idDaRota, lerCorpo } from '../_lib/validacao';

const Cliente = z.object(camposDeCliente);

// GET /api/clientes/:id -> um cliente com todos os acessos dele
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const cliente = await env.DB.prepare(
    'SELECT clientes.*, categorias.nome AS categoria_nome FROM clientes LEFT JOIN categorias ON categorias.id = clientes.categoria_id WHERE clientes.id = ?',
  )
    .bind(id)
    .first();

  if (!cliente) return naoEncontrado('Cliente não encontrado');

  const { results: acessos } = await env.DB.prepare('SELECT * FROM acessos WHERE cliente_id = ?')
    .bind(id)
    .all();

  const certificado = await env.DB.prepare(
    'SELECT nome_arquivo, senha, validade, atualizado_em FROM certificados WHERE cliente_id = ?',
  )
    .bind(id)
    .first();

  const { results: licencasSelecionadas } = await env.DB.prepare(
    `SELECT licencas.id, licencas.nome FROM cliente_licencas
       JOIN licencas ON licencas.id = cliente_licencas.licenca_id
       WHERE cliente_licencas.cliente_id = ?`,
  )
    .bind(id)
    .all();

  return json({
    ...cliente,
    acessos,
    certificado: certificado || null,
    licencas_selecionadas: licencasSelecionadas,
  });
}

// PUT /api/clientes/:id -> atualiza os dados do cliente
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Cliente);
  if (erro) return erro;

  await env.DB.prepare(
    'UPDATE clientes SET nome = ?, cnpj = ?, telefone = ?, observacoes = ?, categoria_id = ?, licencas = ?, enquadramento_fiscal = ?, custo_mensalidade = ?, valor_mensalidade = ? WHERE id = ?',
  )
    .bind(
      dados.nome,
      dados.cnpj,
      dados.telefone,
      dados.observacoes,
      dados.categoria_id,
      dados.licencas,
      dados.enquadramento_fiscal,
      dados.custo_mensalidade,
      dados.valor_mensalidade,
      id,
    )
    .run();

  // licenca_ids ausente = a tela não mexeu nas licenças; presente = troca a lista inteira
  if (dados.licenca_ids) {
    await env.DB.prepare('DELETE FROM cliente_licencas WHERE cliente_id = ?').bind(id).run();
    for (const licencaId of dados.licenca_ids) {
      await env.DB.prepare('INSERT INTO cliente_licencas (cliente_id, licenca_id) VALUES (?, ?)')
        .bind(id, licencaId)
        .run();
    }
  }

  return ok();
}

// DELETE /api/clientes/:id -> remove o cliente e os acessos dele (ON DELETE CASCADE cuida dos acessos)
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM clientes WHERE id = ?').bind(id).run();
  return ok();
}
