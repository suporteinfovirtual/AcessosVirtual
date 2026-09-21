import type { Env } from './_lib/env';
import { naoAutenticado } from './_lib/http';
import { sessaoValida } from './_lib/sessao';

// Roda antes de qualquer requisição para /api/*. Deixa passar só /api/login sem sessão válida.
export async function onRequest(context: EventContext<Env, never, unknown>) {
  const { request, next, env } = context;

  if (new URL(request.url).pathname === '/api/login') {
    return next();
  }

  if (!(await sessaoValida(request, env.SEGREDO_SESSAO))) {
    return naoAutenticado();
  }

  const resposta = await next();

  // qualquer gravação bem-sucedida avisa os outros computadores que os dados mudaram
  if (request.method !== 'GET' && request.method !== 'HEAD' && resposta.ok) {
    context.waitUntil(
      env.DB.prepare('UPDATE sincronizacao SET versao = versao + 1 WHERE id = 1')
        .run()
        .catch(() => {}),
    );
  }

  return resposta;
}
