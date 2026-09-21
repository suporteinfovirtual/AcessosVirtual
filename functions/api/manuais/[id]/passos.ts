import { z } from 'zod';
import type { ContextoComId } from '../../_lib/env';
import { criado } from '../../_lib/http';
import { ordem } from '../../_lib/schemas';
import { arquivoOpcional, idDaRota, lerFormulario, textoOpcionalCru } from '../../_lib/validacao';

const Passo = z.object({
  ordem,
  texto: textoOpcionalCru,
  arquivo: arquivoOpcional,
});

// POST /api/manuais/:id/passos -> adiciona um passo ao manual
// multipart/form-data: ordem, texto, arquivo (opcional). Imagens são adicionadas depois, via /api/passos/:id/imagens
export async function onRequestPost({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerFormulario(request, Passo);
  if (erro) return erro;

  const resultado = await env.DB.prepare(
    'INSERT INTO manual_passos (manual_id, ordem, texto, arquivo, arquivo_nome) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      dados.ordem,
      dados.texto,
      dados.arquivo ? await dados.arquivo.arrayBuffer() : null,
      dados.arquivo ? dados.arquivo.name : null,
    )
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
