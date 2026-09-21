import type { ContextoComId } from '../../_lib/env';
import { criado } from '../../_lib/http';
import { AcessoCompleto } from '../../_lib/schemas';
import { idDaRota, lerCorpo } from '../../_lib/validacao';

// POST /api/clientes/:id/acessos -> adiciona um novo acesso (anydesk/acesso_web/acesso_zeta) a um cliente existente
export async function onRequestPost({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, AcessoCompleto);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO acessos (cliente_id, tipo, identificador, usuario, senha, link, servidor, contabilidade_id, enviar_contabilidade, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      dados.tipo,
      dados.identificador,
      dados.usuario,
      dados.senha,
      dados.link,
      dados.servidor,
      dados.contabilidade_id,
      dados.enviar_contabilidade,
      dados.observacoes,
    )
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
