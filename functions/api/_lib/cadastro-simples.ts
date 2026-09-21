import { z } from 'zod';
import type { Contexto, ContextoComId } from './env';
import { conflito, criado, json, ok } from './http';
import { idDaRota, lerCorpo, textoObrigatorio } from './validacao';

// categorias, licenças e técnicos são a mesma tabela com outro nome: id + nome único.
// Eram três CRUDs idênticos copiados; agora cada rota só diz de qual tabela se trata.
// O nome da tabela é uma constante desta união (nunca vem da requisição), então entrar
// direto no SQL é seguro.
type Tabela = 'categorias' | 'licencas' | 'tecnicos';

const Nome = z.object({ nome: textoObrigatorio('Nome é obrigatório') });

// O D1 só avisa da colisão de nome pelo texto do erro da constraint UNIQUE. Antes, o
// catch engolia qualquer falha como "já existe" — inclusive um banco fora do ar.
function ehNomeRepetido(e: unknown): boolean {
  return e instanceof Error && /UNIQUE/i.test(e.message);
}

export function cadastroSimples(tabela: Tabela, mensagemNomeRepetido: string) {
  return {
    listar: async ({ env }: Contexto) => {
      const { results } = await env.DB.prepare(`SELECT * FROM ${tabela} ORDER BY nome`).all();
      return json(results);
    },

    criar: async ({ request, env }: Contexto) => {
      const { dados, erro } = await lerCorpo(request, Nome);
      if (erro) return erro;

      try {
        const resultado = await env.DB.prepare(`INSERT INTO ${tabela} (nome) VALUES (?)`)
          .bind(dados.nome)
          .run();
        return criado({ id: resultado.meta.last_row_id, nome: dados.nome });
      } catch (e) {
        if (ehNomeRepetido(e)) return conflito(mensagemNomeRepetido);
        throw e;
      }
    },

    renomear: async ({ request, env, params }: ContextoComId) => {
      const { id, erro: erroId } = idDaRota(params);
      if (erroId) return erroId;

      const { dados, erro } = await lerCorpo(request, Nome);
      if (erro) return erro;

      try {
        await env.DB.prepare(`UPDATE ${tabela} SET nome = ? WHERE id = ?`)
          .bind(dados.nome, id)
          .run();
        return ok();
      } catch (e) {
        if (ehNomeRepetido(e)) return conflito(mensagemNomeRepetido);
        throw e;
      }
    },

    remover: async ({ env, params }: ContextoComId) => {
      const { id, erro } = idDaRota(params);
      if (erro) return erro;

      await env.DB.prepare(`DELETE FROM ${tabela} WHERE id = ?`).bind(id).run();
      return ok();
    },
  };
}
