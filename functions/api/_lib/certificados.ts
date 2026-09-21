import { z } from 'zod';
import type { ContextoComId } from './env';
import { download, naoEncontrado, ok } from './http';
import type { CorpoBinario } from './http';
import {
  arquivoObrigatorio,
  dataIsoOpcional,
  idDaRota,
  lerFormulario,
  textoOpcional,
  textoOpcionalCru,
} from './validacao';

// O certificado do cliente unificado e o do cliente por sistema são a mesma rota duas
// vezes: muda só a tabela e a coluna que aponta pro dono. Os nomes vêm desta união, nunca
// da requisição, então podem entrar direto no SQL.
type Destino =
  | { tabela: 'certificados'; coluna: 'cliente_id' }
  | { tabela: 'certificados_sistemas'; coluna: 'cliente_sistema_id' };

const Certificado = z.object({
  arquivo: arquivoObrigatorio('Arquivo do certificado é obrigatório'),
  nome_arquivo: textoOpcional,
  senha: textoOpcionalCru,
  validade: dataIsoOpcional('Validade deve estar no formato AAAA-MM-DD'),
});

export function rotasDeCertificado({ tabela, coluna }: Destino) {
  return {
    // GET -> baixa o arquivo .pfx do cliente
    baixar: async ({ env, params }: ContextoComId) => {
      const { id, erro } = idDaRota(params);
      if (erro) return erro;

      const registro = await env.DB.prepare(
        `SELECT nome_arquivo, arquivo FROM ${tabela} WHERE ${coluna} = ?`,
      )
        .bind(id)
        .first<{ nome_arquivo: string; arquivo: CorpoBinario }>();

      if (!registro) return naoEncontrado('Certificado não encontrado');

      return download(registro.arquivo, {
        nome: registro.nome_arquivo,
        tipo: 'application/x-pkcs12',
      });
    },

    // POST -> envia (ou substitui) o certificado do cliente
    // multipart/form-data: arquivo (.pfx), senha, validade (AAAA-MM-DD), nome_arquivo
    enviar: async ({ request, env, params }: ContextoComId) => {
      const { id, erro: erroId } = idDaRota(params);
      if (erroId) return erroId;

      const { dados, erro } = await lerFormulario(request, Certificado);
      if (erro) return erro;

      await env.DB.prepare(
        `INSERT INTO ${tabela} (${coluna}, nome_arquivo, arquivo, senha, validade, atualizado_em)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(${coluna}) DO UPDATE SET
             nome_arquivo = excluded.nome_arquivo,
             arquivo = excluded.arquivo,
             senha = excluded.senha,
             validade = excluded.validade,
             atualizado_em = excluded.atualizado_em`,
      )
        .bind(
          id,
          dados.nome_arquivo || dados.arquivo.name || 'certificado.pfx',
          await dados.arquivo.arrayBuffer(),
          dados.senha,
          dados.validade,
        )
        .run();

      return ok();
    },
  };
}
