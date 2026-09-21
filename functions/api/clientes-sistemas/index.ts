import { z } from 'zod';
import { SISTEMAS_COM_CADASTRO_PROPRIO } from '../_lib/dominio';
import type { Contexto } from '../_lib/env';
import { criado, json } from '../_lib/http';
import { camposDeClienteSistema } from '../_lib/schemas';
import { lerConsulta, lerCorpo, opcaoDe, textoOpcional } from '../_lib/validacao';

interface LinhaCliente {
  id: number;
  [coluna: string]: unknown;
}
interface LinhaLicenca {
  cliente_sistema_id: number;
  id: number;
  nome: string;
}

const Consulta = z.object({
  sistema: opcaoDe(SISTEMAS_COM_CADASTRO_PROPRIO, 'Sistema inválido').optional(),
  busca: textoOpcional,
});

const ClienteSistema = z.object({
  sistema: opcaoDe(SISTEMAS_COM_CADASTRO_PROPRIO, 'Sistema inválido'),
  ...camposDeClienteSistema,
});

// GET /api/clientes-sistemas?sistema=uniplus&busca=texto -> lista os clientes de um sistema
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Consulta);
  if (erro) return erro;

  const condicoes: string[] = [];
  const binds: unknown[] = [];

  if (dados.sistema) {
    condicoes.push('clientes_sistemas.sistema = ?');
    binds.push(dados.sistema);
  }
  if (dados.busca) {
    condicoes.push('(clientes_sistemas.nome LIKE ? OR clientes_sistemas.cnpj LIKE ?)');
    binds.push(`%${dados.busca}%`, `%${dados.busca}%`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { results: clientes } = await env.DB.prepare(
    `SELECT clientes_sistemas.*, categorias.nome AS categoria_nome
       FROM clientes_sistemas LEFT JOIN categorias ON categorias.id = clientes_sistemas.categoria_id
       ${where} ORDER BY clientes_sistemas.nome`,
  )
    .bind(...binds)
    .all<LinhaCliente>();

  if (clientes.length === 0) return json([]);

  const { results: licencasVinculadas } = await env.DB.prepare(
    `SELECT clientes_sistemas_licencas.cliente_sistema_id, licencas.id, licencas.nome
       FROM clientes_sistemas_licencas JOIN licencas ON licencas.id = clientes_sistemas_licencas.licenca_id`,
  ).all<LinhaLicenca>();

  const clientesComLicencas = clientes.map((cliente) => ({
    ...cliente,
    licencas_selecionadas: licencasVinculadas
      .filter((licenca) => licenca.cliente_sistema_id === cliente.id)
      .map((licenca) => ({ id: licenca.id, nome: licenca.nome })),
  }));

  return json(clientesComLicencas);
}

// POST /api/clientes-sistemas -> cria um cliente num dos sistemas
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, ClienteSistema);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    `INSERT INTO clientes_sistemas (sistema, nome, cnpj, telefone, licencas, enquadramento_fiscal, versao_build, observacoes, custo_mensalidade, valor_mensalidade, categoria_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      dados.sistema,
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
    )
    .run();

  const clienteSistemaId = resultado.meta.last_row_id;

  for (const licencaId of dados.licenca_ids ?? []) {
    await env.DB.prepare(
      'INSERT INTO clientes_sistemas_licencas (cliente_sistema_id, licenca_id) VALUES (?, ?)',
    )
      .bind(clienteSistemaId, licencaId)
      .run();
  }

  return criado({ id: clienteSistemaId });
}
