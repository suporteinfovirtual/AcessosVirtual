import { z } from 'zod';
import type { Contexto } from '../_lib/env';
import { criado, grandeDemais, json } from '../_lib/http';
import { ERRO_ACIMA_DO_LIMITE, LIMITE_UPLOAD_BYTES } from '../_lib/dominio';
import { arquivoObrigatorio, lerFormulario, textoOpcional } from '../_lib/validacao';

const Upload = z.object({
  arquivo: arquivoObrigatorio('Arquivo é obrigatório'),
  titulo: textoOpcional,
});

// GET /api/arquivos -> lista os arquivos (metadados, sem os bytes)
export async function onRequestGet({ env }: Contexto) {
  const { results } = await env.DB.prepare(
    'SELECT id, nome_arquivo, titulo, tipo, tamanho, criado_em, atualizado_em FROM arquivos ORDER BY COALESCE(titulo, nome_arquivo)',
  ).all();

  return json(results);
}

// POST /api/arquivos -> envia um arquivo novo
// multipart/form-data: arquivo, titulo (opcional)
export async function onRequestPost({ request, env }: Contexto) {
  const { dados, erro } = await lerFormulario(request, Upload);
  if (erro) return erro;

  if (dados.arquivo.size > LIMITE_UPLOAD_BYTES) return grandeDemais(ERRO_ACIMA_DO_LIMITE);

  // O conteúdo vai pro R2; o D1 guarda só os metadados e a chave do objeto.
  const chave = `arquivos/${crypto.randomUUID()}`;
  await env.BUCKET.put(chave, dados.arquivo, {
    httpMetadata: { contentType: dados.arquivo.type || 'application/octet-stream' },
  });

  const resultado = await env.DB.prepare(
    'INSERT INTO arquivos (nome_arquivo, titulo, tipo, tamanho, r2_key) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(dados.arquivo.name, dados.titulo, dados.arquivo.type || null, dados.arquivo.size, chave)
    .run();

  return criado({ id: resultado.meta.last_row_id });
}
