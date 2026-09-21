import type { ContextoComId } from './env';
import { ok } from './http';
import { TrocaDeCategoria } from './schemas';
import { idDaRota, lerCorpo } from './validacao';

// Trocar só a categoria é a mesma rota pro cadastro unificado e pro cadastro por sistema:
// muda só a tabela, que vem desta união e nunca da requisição.
type Tabela = 'clientes' | 'clientes_sistemas';

// PUT -> troca só a categoria do cliente (usado na tela de Instalação, que não tem os
// outros campos do cadastro pra mandar no PUT completo)
export function trocarCategoria(tabela: Tabela) {
  return async ({ request, env, params }: ContextoComId) => {
    const { id, erro: erroId } = idDaRota(params);
    if (erroId) return erroId;

    const { dados, erro } = await lerCorpo(request, TrocaDeCategoria);
    if (erro) return erro;

    await env.DB.prepare(`UPDATE ${tabela} SET categoria_id = ? WHERE id = ?`)
      .bind(dados.categoria_id, id)
      .run();

    return ok();
  };
}
