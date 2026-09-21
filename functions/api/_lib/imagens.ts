import { z } from 'zod';
import type { ContextoComId } from './env';
import { criado } from './http';
import { arquivoObrigatorio, idDaRota, lerFormulario } from './validacao';

// Anexar um print a um passo de manual e a um artigo da wiki é a mesma rota: muda a
// tabela e a coluna do dono. Ambas vêm desta união, nunca da requisição.
type Destino =
  | { tabela: 'manual_passo_imagens'; coluna: 'passo_id' }
  | { tabela: 'wiki_artigo_imagens'; coluna: 'artigo_id' };

const Imagem = z.object({
  imagem: arquivoObrigatorio('Imagem é obrigatória').refine((a) => a.size > 0, {
    error: 'Imagem é obrigatória',
  }),
});

// POST -> adiciona mais uma imagem (print) ao passo/artigo
// multipart/form-data: imagem (arquivo)
export function anexarImagem({ tabela, coluna }: Destino) {
  return async ({ request, env, params }: ContextoComId) => {
    const { id, erro: erroId } = idDaRota(params);
    if (erroId) return erroId;

    const { dados, erro } = await lerFormulario(request, Imagem);
    if (erro) return erro;

    const proxima = await env.DB.prepare(
      `SELECT COALESCE(MAX(ordem), 0) + 1 AS ordem FROM ${tabela} WHERE ${coluna} = ?`,
    )
      .bind(id)
      .first<{ ordem: number }>();

    const resultado = await env.DB.prepare(
      `INSERT INTO ${tabela} (${coluna}, ordem, imagem, imagem_nome, imagem_tipo) VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        proxima?.ordem || 1,
        await dados.imagem.arrayBuffer(),
        dados.imagem.name || null,
        dados.imagem.type || null,
      )
      .run();

    return criado({ id: resultado.meta.last_row_id });
  };
}
