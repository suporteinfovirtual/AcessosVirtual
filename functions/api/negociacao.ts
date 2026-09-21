import { z } from 'zod';
import { STATUS_NEGOCIACAO } from './_lib/dominio';
import type { Contexto } from './_lib/env';
import { criado, json } from './_lib/http';
import { camposDeNegociacao } from './_lib/schemas';
import { lerConsulta, lerCorpo, opcaoDe, textoOpcional } from './_lib/validacao';

const Consulta = z.object({
  busca: textoOpcional,
  status: opcaoDe(STATUS_NEGOCIACAO, 'Status inválido').optional(),
});

const Negociacao = z.object(camposDeNegociacao);

// GET /api/negociacao?busca=texto&status=em_negociacao -> lista os clientes em negociação,
// filtrando por nome/cnpj e, opcionalmente, por status (em_negociacao | desistiu | fechou)
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Consulta);
  if (erro) return erro;

  const condicoes: string[] = [];
  const binds: string[] = [];

  if (dados.busca) {
    condicoes.push('(n.nome LIKE ? OR n.cnpj LIKE ?)');
    binds.push(`%${dados.busca}%`, `%${dados.busca}%`);
  }
  if (dados.status) {
    condicoes.push('n.status = ?');
    binds.push(dados.status);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT n.*, categorias.nome AS categoria_nome,
              (SELECT MAX(instalado) FROM instalacoes WHERE instalacoes.negociacao_id = n.id) AS instalado
       FROM clientes_negociacao n LEFT JOIN categorias ON categorias.id = n.categoria_id
       ${where} ORDER BY n.nome`,
  )
    .bind(...binds)
    .all();

  return json(results);
}

// POST /api/negociacao -> cria um cliente em negociação
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Negociacao);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO clientes_negociacao (nome, cnpj, telefone, email, aliquota, enquadramento_fiscal, observacoes, sistema, precisa_migrar_base, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      dados.nome,
      dados.cnpj,
      dados.telefone,
      dados.email,
      dados.aliquota,
      dados.enquadramento_fiscal,
      dados.observacoes,
      dados.sistema ?? null,
      dados.precisa_migrar_base,
      dados.categoria_id,
    )
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
