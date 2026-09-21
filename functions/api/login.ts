import { z } from 'zod';
import type { Contexto } from './_lib/env';
import { erro, json } from './_lib/http';
import { cookieDeSessao } from './_lib/sessao';
import { lerCorpo, textoObrigatorio } from './_lib/validacao';

const Login = z.object({
  senha: textoObrigatorio('Senha é obrigatória'),
});

// POST /api/login -> confere a senha única e grava o cookie de sessão assinado
export async function onRequestPost(context: Contexto) {
  const { request, env } = context;

  const { dados, erro: erroCorpo } = await lerCorpo(request, Login);
  if (erroCorpo) return erroCorpo;

  if (dados.senha !== env.SENHA_PAINEL) {
    return erro('Senha incorreta', 401);
  }

  return json(
    { ok: true },
    { headers: { 'Set-Cookie': await cookieDeSessao(env.SEGREDO_SESSAO) } },
  );
}
