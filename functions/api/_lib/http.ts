// Montagem das respostas HTTP. Antes cada rota escrevia o new Response(JSON.stringify(...))
// na mão, e boa parte dos erros saía sem Content-Type.

const TIPO_JSON = 'application/json; charset=utf-8';

export function json(
  dados: unknown,
  opcoes: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(dados), {
    status: opcoes.status ?? 200,
    headers: { 'Content-Type': TIPO_JSON, ...opcoes.headers },
  });
}

// Resposta padrão de gravação bem-sucedida (PUT/PATCH/DELETE).
export function ok(): Response {
  return json({ ok: true });
}

// Resposta padrão de criação (POST), normalmente { id }.
export function criado(dados: unknown): Response {
  return json(dados, { status: 201 });
}

export function erro(mensagem: string, status: number): Response {
  return json({ erro: mensagem }, { status });
}

export const requisicaoInvalida = (mensagem = 'Requisição inválida') => erro(mensagem, 400);
export const naoAutenticado = () => erro('Não autenticado', 401);
export const naoEncontrado = (mensagem: string) => erro(mensagem, 404);
export const conflito = (mensagem: string) => erro(mensagem, 409);
export const grandeDemais = (mensagem: string) => erro(mensagem, 413);

// Tira aspas e quebras de linha pra não furar o header Content-Disposition.
function nomeSeguro(nome: string): string {
  return Array.from(nome, (c) => (c === '"' || c === '\r' || c === '\n' ? '_' : c)).join('');
}

// O D1 devolve BLOB como array comum de números, NÃO como ArrayBuffer — mesmo quando a
// tipagem da consulta diz ArrayBuffer, porque `.first<T>()` é só um cast. O Response
// recusa um array desses ("This ReadableStream did not return bytes") e o download sai
// com 0 bytes. Por isso todo corpo binário passa por aqui antes de virar resposta.
export type CorpoBinario = ArrayBuffer | ArrayBufferView | number[];

function paraBytes(corpo: CorpoBinario): Uint8Array {
  if (corpo instanceof ArrayBuffer) return new Uint8Array(corpo);
  if (ArrayBuffer.isView(corpo)) {
    return new Uint8Array(corpo.buffer, corpo.byteOffset, corpo.byteLength);
  }
  return new Uint8Array(corpo);
}

// Arquivo que o navegador deve baixar (certificados, anexos, arquivos da aba Ferramentas).
// O tamanho só é informado pra stream (R2, que sabe o próprio size); pra bytes ele é medido
// aqui, porque pedir isso a quem chama era justamente o que produzia Content-Length inválido.
export function download(
  corpo: CorpoBinario | ReadableStream | null,
  opcoes: { nome: string; tipo?: string | null; tamanho?: number },
): Response {
  const ehStream = corpo === null || corpo instanceof ReadableStream;
  const corpoFinal = ehStream ? (corpo as ReadableStream | null) : paraBytes(corpo as CorpoBinario);
  const tamanho = ehStream ? opcoes.tamanho : (corpoFinal as Uint8Array).byteLength;

  const headers: Record<string, string> = {
    'Content-Type': opcoes.tipo || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${nomeSeguro(opcoes.nome)}"`,
  };
  if (tamanho !== undefined) headers['Content-Length'] = String(tamanho);

  return new Response(corpoFinal, { headers });
}

// Conteúdo exibido na própria página (prints dos manuais e da wiki), sem Content-Disposition.
export function embutido(bytes: CorpoBinario, tipo: string | null): Response {
  const dados = paraBytes(bytes);
  return new Response(dados, {
    headers: {
      'Content-Type': tipo || 'application/octet-stream',
      'Content-Length': String(dados.byteLength),
    },
  });
}
