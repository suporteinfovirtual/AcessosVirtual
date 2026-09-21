import { z } from 'zod';
import { SISTEMAS } from './_lib/dominio';
import type { Contexto } from './_lib/env';
import { json, ok } from './_lib/http';
import { idObrigatorio, lerConsulta, lerCorpo, opcaoDe, textoObrigatorio } from './_lib/validacao';

interface ClienteFaturavel {
  cliente_sistema: string;
  cliente_ref_id: number;
  cliente_nome: string;
}

// filtro desconhecido continua caindo em "pendentes", como antes
const Consulta = z.object({
  filtro: z.enum(['pendentes', 'faturados']).catch('pendentes'),
});

const Faturamento = z.object({
  cliente_sistema: opcaoDe(SISTEMAS, 'Sistema inválido'),
  cliente_ref_id: idObrigatorio('Cliente é obrigatório'),
  cliente_nome: textoObrigatorio('Cliente é obrigatório'),
});

// GET /api/faturamento?filtro=pendentes|faturados
// pendentes (padrão): clientes com implantação concluída e sem nenhuma pendente no
// futuro, que ainda não foram marcados como faturados
// faturados: clientes já marcados, com a data em que foram faturados
export async function onRequestGet({ request, env }: Contexto) {
  const { dados, erro } = lerConsulta(request, Consulta);
  if (erro) return erro;

  const { results: faturados } = await env.DB.prepare(
    'SELECT * FROM faturamento_clientes ORDER BY faturado_em DESC',
  ).all<ClienteFaturavel>();

  if (dados.filtro === 'faturados') return json(faturados);

  // Um cliente fica pronto pra faturar por dois caminhos: terminando o treinamento, ou
  // dispensando o treinamento e só sendo instalado. O UNION junta os dois e o GROUP BY de
  // fora tira a repetição de quem se encaixa nos dois.
  const { results: prontos } = await env.DB.prepare(
    `SELECT cliente_sistema, cliente_ref_id, MAX(cliente_nome) AS cliente_nome
       FROM (
         -- treinamento já concluído e nenhum outro marcado pra frente
         SELECT cliente_sistema, cliente_ref_id, MAX(cliente_nome) AS cliente_nome
         FROM implantacoes
         GROUP BY cliente_sistema, cliente_ref_id
         HAVING
           MAX(CASE WHEN concluida_manual = 1 OR data < date('now') THEN 1 ELSE 0 END) = 1
           AND MAX(CASE WHEN concluida_manual = 0 AND data >= date('now') THEN 1 ELSE 0 END) = 0

         UNION ALL

         -- instalado sem treinamento: não passa pela agenda, então já está pronto. O NOT
         -- EXISTS cobre quem tinha treinamento agendado antes de a opção ser desmarcada:
         -- enquanto esse agendamento não acontecer, ele não conta como pronto.
         SELECT i.cliente_sistema, i.cliente_ref_id, i.cliente_nome
         FROM instalacoes i
         WHERE i.instalado = 1
           AND i.precisa_treinamento = 0
           AND NOT EXISTS (
             SELECT 1 FROM implantacoes p
             WHERE p.cliente_sistema = i.cliente_sistema
               AND p.cliente_ref_id = i.cliente_ref_id
               AND p.concluida_manual = 0
               AND p.data >= date('now')
           )
       )
       GROUP BY cliente_sistema, cliente_ref_id
       ORDER BY cliente_nome`,
  ).all<ClienteFaturavel>();

  const chave = (c: ClienteFaturavel) => `${c.cliente_sistema}:${c.cliente_ref_id}`;
  const jaFaturados = new Set(faturados.map(chave));

  return json(prontos.filter((pronto) => !jaFaturados.has(chave(pronto))));
}

// POST /api/faturamento -> marca um cliente como faturado
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerCorpo(request, Faturamento);
  if (erro) return erro;

  await env.DB.prepare(
    `INSERT INTO faturamento_clientes (cliente_sistema, cliente_ref_id, cliente_nome)
       VALUES (?, ?, ?)
       ON CONFLICT(cliente_sistema, cliente_ref_id) DO UPDATE SET
         cliente_nome = excluded.cliente_nome, faturado_em = datetime('now')`,
  )
    .bind(dados.cliente_sistema, dados.cliente_ref_id, dados.cliente_nome)
    .run();

  return ok();
}
