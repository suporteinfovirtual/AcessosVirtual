import { z } from 'zod';
import { SISTEMAS } from './_lib/dominio';
import type { Contexto } from './_lib/env';
import { criado, json } from './_lib/http';
import {
  flag,
  idObrigatorio,
  idOpcional,
  lerConsulta,
  lerCorpo,
  opcaoDe,
  textoObrigatorio,
  textoOpcional,
} from './_lib/validacao';

const Consulta = z.object({
  status: z.enum(['a_instalar', 'instalado']).optional(),
  // ?pendente_agendamento=1 -> só as já instaladas que ainda não têm treinamento agendado
  pendente_agendamento: z
    .string()
    .optional()
    .transform((valor) => valor === '1'),
});

const Instalacao = z.object({
  cliente_sistema: opcaoDe(SISTEMAS, 'Sistema inválido'),
  cliente_ref_id: idObrigatorio('Cliente é obrigatório'),
  cliente_nome: textoObrigatorio('Cliente é obrigatório'),
  cnpj: textoOpcional,
  telefone: textoOpcional,
  email: textoOpcional,
  aliquota: textoOpcional,
  enquadramento_fiscal: textoOpcional,
  precisa_migrar_base: flag,
  negociacao_id: idOpcional('Negociação inválida'),
  observacoes: textoOpcional,
});

// GET /api/instalacoes -> lista as instalações (com o nome do técnico que instalou).
// Filtros: ?status=a_instalar | instalado
//          ?pendente_agendamento=1 -> só as já instaladas que ainda não têm treinamento
//                                     agendado (nenhuma linha em implantacoes pro mesmo cliente)
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Consulta);
  if (erro) return erro;

  const condicoes: string[] = [];

  if (dados.status === 'a_instalar') condicoes.push('instalacoes.instalado = 0');
  if (dados.status === 'instalado') condicoes.push('instalacoes.instalado = 1');

  if (dados.pendente_agendamento) {
    condicoes.push('instalacoes.instalado = 1');
    condicoes.push(
      `NOT EXISTS (
         SELECT 1 FROM implantacoes
         WHERE implantacoes.cliente_sistema = instalacoes.cliente_sistema
           AND implantacoes.cliente_ref_id = instalacoes.cliente_ref_id
       )`,
    );
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT instalacoes.*, tecnicos.nome AS tecnico_nome
       FROM instalacoes LEFT JOIN tecnicos ON tecnicos.id = instalacoes.tecnico_id
       ${where}
       ORDER BY instalacoes.instalado, COALESCE(instalacoes.data_instalacao, instalacoes.criado_em) DESC, instalacoes.cliente_nome`,
  ).all();

  return json(results);
}

// POST /api/instalacoes -> cria uma instalação a partir da conversão de uma negociação fechada
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Instalacao);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    `INSERT INTO instalacoes
         (cliente_sistema, cliente_ref_id, cliente_nome, cnpj, telefone, email, aliquota, enquadramento_fiscal, precisa_migrar_base, negociacao_id, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      dados.cliente_sistema,
      dados.cliente_ref_id,
      dados.cliente_nome,
      dados.cnpj,
      dados.telefone,
      dados.email,
      dados.aliquota,
      dados.enquadramento_fiscal,
      dados.precisa_migrar_base,
      dados.negociacao_id,
      dados.observacoes,
    )
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
