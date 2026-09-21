import { z } from 'zod';
import type { ContextoComId } from '../_lib/env';
import { download, grandeDemais, naoEncontrado, ok } from '../_lib/http';
import { ERRO_ACIMA_DO_LIMITE, LIMITE_UPLOAD_BYTES } from '../_lib/dominio';
import {
  arquivoObrigatorio,
  idDaRota,
  lerCorpo,
  lerFormulario,
  textoOpcional,
} from '../_lib/validacao';

interface Registro {
  nome_arquivo: string;
  tipo: string | null;
  arquivo: ArrayBuffer | null;
  r2_key: string | null;
}

const Substituicao = z.object({
  arquivo: arquivoObrigatorio('Arquivo é obrigatório'),
});

const Renomeacao = z.object({
  titulo: textoOpcional,
});

// GET /api/arquivos/:id -> baixa o arquivo
export async function onRequestGet({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const registro = await env.DB.prepare(
    'SELECT nome_arquivo, tipo, arquivo, r2_key FROM arquivos WHERE id = ?',
  )
    .bind(id)
    .first<Registro>();

  if (!registro) return naoEncontrado('Arquivo não encontrado');

  // Arquivos novos vivem no R2; os antigos ainda têm o conteúdo no BLOB do D1.
  if (registro.r2_key) {
    const objeto = await env.BUCKET.get(registro.r2_key);
    if (!objeto) return naoEncontrado('Arquivo não encontrado');

    return download(objeto.body, {
      nome: registro.nome_arquivo,
      tipo: registro.tipo,
      tamanho: objeto.size,
    });
  }

  const bytes = registro.arquivo ?? new ArrayBuffer(0);
  return download(bytes, {
    nome: registro.nome_arquivo,
    tipo: registro.tipo,
    tamanho: bytes.byteLength,
  });
}

// PUT /api/arquivos/:id -> substitui o conteúdo do arquivo
// multipart/form-data: arquivo
export async function onRequestPut({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerFormulario(request, Substituicao);
  if (erro) return erro;

  if (dados.arquivo.size > LIMITE_UPLOAD_BYTES) return grandeDemais(ERRO_ACIMA_DO_LIMITE);

  const registro = await env.DB.prepare('SELECT r2_key FROM arquivos WHERE id = ?')
    .bind(id)
    .first<{ r2_key: string | null }>();

  if (!registro) return naoEncontrado('Arquivo não encontrado');

  // Reaproveita a chave existente; se a linha for legado (sem r2_key), cria uma nova.
  const chave = registro.r2_key || `arquivos/${crypto.randomUUID()}`;
  await env.BUCKET.put(chave, dados.arquivo, {
    httpMetadata: { contentType: dados.arquivo.type || 'application/octet-stream' },
  });

  await env.DB.prepare(
    `UPDATE arquivos SET nome_arquivo = ?, tipo = ?, tamanho = ?, arquivo = NULL, r2_key = ?, atualizado_em = datetime('now')
       WHERE id = ?`,
  )
    .bind(dados.arquivo.name, dados.arquivo.type || null, dados.arquivo.size, chave, id)
    .run();

  return ok();
}

// PATCH /api/arquivos/:id -> renomeia o titulo amigável (sem mexer no arquivo)
// json: { titulo: string | null }
export async function onRequestPatch({ request, env, params }: ContextoComId) {
  const { id, erro: erroId } = idDaRota(params);
  if (erroId) return erroId;

  const { dados, erro } = await lerCorpo(request, Renomeacao);
  if (erro) return erro;

  await env.DB.prepare(
    `UPDATE arquivos SET titulo = ?, atualizado_em = datetime('now') WHERE id = ?`,
  )
    .bind(dados.titulo, id)
    .run();

  return ok();
}

// DELETE /api/arquivos/:id -> remove o arquivo
export async function onRequestDelete({ env, params }: ContextoComId) {
  const { id, erro } = idDaRota(params);
  if (erro) return erro;

  const registro = await env.DB.prepare('SELECT r2_key FROM arquivos WHERE id = ?')
    .bind(id)
    .first<{ r2_key: string | null }>();

  if (registro?.r2_key) {
    await env.BUCKET.delete(registro.r2_key);
  }

  await env.DB.prepare('DELETE FROM arquivos WHERE id = ?').bind(id).run();
  return ok();
}
