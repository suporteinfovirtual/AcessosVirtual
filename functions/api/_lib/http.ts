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

// Arquivo que o navegador deve baixar (certificados, anexos, arquivos da aba Ferramentas).
export function download(
  corpo: ArrayBuffer | ReadableStream | null,
  opcoes: { nome: string; tipo?: string | null; tamanho: number },
): Response {
  return new Response(corpo instanceof ArrayBuffer ? new Uint8Array(corpo) : corpo, {
    headers: {
      'Content-Type': opcoes.tipo || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${nomeSeguro(opcoes.nome)}"`,
      'Content-Length': String(opcoes.tamanho),
    },
  });
}

// Conteúdo exibido na própria página (prints dos manuais e da wiki), sem Content-Disposition.
export function embutido(bytes: ArrayBuffer, tipo: string | null): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': tipo || 'application/octet-stream',
      'Content-Length': String(bytes.byteLength),
    },
  });
}
