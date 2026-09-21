import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { ok } from '../_lib/http';
import { ordem } from '../_lib/schemas';
import {
  arquivoOpcional,
  idDaRota,
  lerFormulario,
  marcado,
  textoOpcionalCru,
} from '../_lib/validacao';

const Passo = z.object({
  ordem,
  texto: textoOpcionalCru,
  arquivo: arquivoOpcional,
  remover_arquivo: marcado,
});

// PUT /api/passos/:id -> atualiza um passo (ordem/texto e opcionalmente substitui/remove o arquivo)
// multipart/form-data: ordem, texto, arquivo (opcional), remover_arquivo com valor 1
// (imagens são geridas à parte em /api/passos/:id/imagens e /api/imagens/:id)
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerFormulario(request, Passo);
  if (erro) return erro;

  const campos = ['ordem = ?', 'texto = ?'];
  const binds: unknown[] = [dados.ordem, dados.texto];

  if (dados.arquivo) {
    campos.push('arquivo = ?', 'arquivo_nome = ?');
    binds.push(await dados.arquivo.arrayBuffer(), dados.arquivo.name);
  } else if (dados.remover_arquivo) {
    campos.push('arquivo = NULL', 'arquivo_nome = NULL');
  }

  binds.push(id);

  await env.DB.prepare(`UPDATE manual_passos SET ${campos.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  return ok();
}

// DELETE /api/passos/:id -> remove o passo
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  await env.DB.prepare('DELETE FROM manual_passos WHERE id = ?').bind(id).run();
  return ok();
}
