import { z } from 'zod';
import type { Contexto } from '../_lib/env';
import { criado, json } from '../_lib/http';
import { AcessoCompleto, camposDeCliente } from '../_lib/schemas';
import { idObrigatorio, lerConsulta, lerCorpo, textoOpcional } from '../_lib/validacao';

interface LinhaCliente {
  id: number;
  [coluna: string]: unknown;
}
interface LinhaAcesso {
  cliente_id: number;
}
interface LinhaCertificado {
  cliente_id: number;
}
interface LinhaLicenca {
  cliente_id: number;
  id: number;
  nome: string;
}

const Consulta = z.object({
  busca: textoOpcional,
  categoria_id: z.preprocess(
    (valor) => valor || undefined,
    idObrigatorio('Categoria inválida').optional(),
  ),
});

const Cliente = z.object({
  ...camposDeCliente,
  acessos: z.array(AcessoCompleto).optional(),
});

// GET /api/clientes?busca=texto&categoria_id=1  -> lista clientes (com os acessos de cada um), filtrando por nome, cnpj e/ou categoria
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Consulta);
  if (erro) return erro;

  const condicoes: string[] = [];
  const binds: unknown[] = [];

  if (dados.busca) {
    condicoes.push('(clientes.nome LIKE ? OR clientes.cnpj LIKE ?)');
    binds.push(`%${dados.busca}%`, `%${dados.busca}%`);
  }
  if (dados.categoria_id) {
    condicoes.push('clientes.categoria_id = ?');
    binds.push(dados.categoria_id);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { results: clientes } = await env.DB.prepare(
    `SELECT clientes.*, categorias.nome AS categoria_nome FROM clientes LEFT JOIN categorias ON categorias.id = clientes.categoria_id ${where} ORDER BY clientes.nome`,
  )
    .bind(...binds)
    .all<LinhaCliente>();

  if (clientes.length === 0) return json([]);

  const { results: acessos } = await env.DB.prepare(
    `SELECT acessos.*, contabilidades.nome AS contabilidade_nome, contabilidades.email AS contabilidade_email
       FROM acessos LEFT JOIN contabilidades ON contabilidades.id = acessos.contabilidade_id`,
  ).all<LinhaAcesso>();

  const { results: certificados } = await env.DB.prepare(
    'SELECT cliente_id, nome_arquivo, senha, validade, atualizado_em FROM certificados',
  ).all<LinhaCertificado>();

  const { results: licencasVinculadas } = await env.DB.prepare(
    `SELECT cliente_licencas.cliente_id, licencas.id, licencas.nome
       FROM cliente_licencas JOIN licencas ON licencas.id = cliente_licencas.licenca_id`,
  ).all<LinhaLicenca>();

  const clientesComAcessos = clientes.map((cliente) => ({
    ...cliente,
    acessos: acessos.filter((acesso) => acesso.cliente_id === cliente.id),
    certificado: certificados.find((certificado) => certificado.cliente_id === cliente.id) || null,
    licencas_selecionadas: licencasVinculadas
      .filter((licenca) => licenca.cliente_id === cliente.id)
      .map((licenca) => ({ id: licenca.id, nome: licenca.nome })),
  }));

  return json(clientesComAcessos);
}

// POST /api/clientes -> cria um cliente novo, já com os acessos que vierem junto
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Cliente);
  if (erro) return erro;

  const resultadoCliente = await env.DB.prepare(
    'INSERT INTO clientes (nome, cnpj, telefone, observacoes, categoria_id, licencas, enquadramento_fiscal, custo_mensalidade, valor_mensalidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    )
    .run();

  const clienteId = resultadoCliente.meta.last_row_id;

  for (const licencaId of dados.licenca_ids ?? []) {
    await env.DB.prepare('INSERT INTO cliente_licencas (cliente_id, licenca_id) VALUES (?, ?)')
      .bind(clienteId, licencaId)
      .run();
  }

  for (const acesso of dados.acessos ?? []) {
    await env.DB.prepare(
      'INSERT INTO acessos (cliente_id, tipo, identificador, usuario, senha, link, servidor, contabilidade_id, enviar_contabilidade, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        clienteId,
        acesso.tipo,
        acesso.identificador,
        acesso.usuario,
        acesso.senha,
        acesso.link,
        acesso.servidor,
        acesso.contabilidade_id,
        acesso.enviar_contabilidade,
        acesso.observacoes,
      )
      .run();
  }

  return criado({ id: clienteId });
}
