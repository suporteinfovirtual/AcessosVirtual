// Validação de entrada com Zod. Antes cada rota repetia o mesmo try/catch em volta do
// request.json() (34 arquivos) e conferia no máximo se o nome estava preenchido — tudo o
// mais ia cru pro banco.
import { z } from 'zod';
import { requisicaoInvalida } from './http';

// --- peças reaproveitadas pelos schemas de cada rota ---

// Campo de texto obrigatório. `mensagem` é o que o cliente recebe em { erro }.
export const textoObrigatorio = (mensagem: string) =>
  z.string({ error: mensagem }).trim().min(1, { error: mensagem });

// Campo de texto opcional: ausente, null ou só espaços viram null; o resto vem com trim.
export const textoOpcional = z
  .string({ error: 'Texto inválido' })
  .nullish()
  .transform((valor) => valor?.trim() || null);

// Texto opcional preservado como veio, sem trim: usado em senhas, onde um espaço nas
// pontas pode fazer parte do valor e o servidor não tem por que alterar.
export const textoOpcionalCru = z
  .string({ error: 'Texto inválido' })
  .nullish()
  .transform((valor) => valor || null);

// Aceita o número em si ou o texto numérico equivalente; vazio/ausente vira null.
const paraNumero = (valor: unknown) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return Number(valor);
  return valor;
};

// Valor monetário opcional (custo/valor de mensalidade).
export const numeroOpcional = (mensagem: string) =>
  z.preprocess(paraNumero, z.number({ error: mensagem }).nullable());

// Id de outra tabela vindo de um select. Como antes, 0 é tratado como "nenhum".
export const idOpcional = (mensagem: string) =>
  z.preprocess(
    // 0 continua valendo "nenhum", como no `|| null` de antes; texto não-numérico vira NaN
    // e é recusado logo abaixo, em vez de virar null sem ninguém perceber.
    (valor) => {
      const numero = paraNumero(valor);
      return numero === 0 ? null : numero;
    },
    z.number({ error: mensagem }).int({ error: mensagem }).positive({ error: mensagem }).nullable(),
  );

// Id obrigatório de outra tabela.
export const idObrigatorio = (mensagem: string) =>
  z.preprocess(
    paraNumero,
    z.number({ error: mensagem }).int({ error: mensagem }).positive({ error: mensagem }),
  );

// Flag booleana: o SQLite guarda 0/1, então já sai convertida.
export const flag = z
  .union([z.boolean(), z.literal(0), z.literal(1)], { error: 'Valor deve ser verdadeiro ou falso' })
  .nullish()
  .transform((valor) => (valor ? 1 : 0));

// Data no formato YYYY-MM-DD, que é como o SQLite guarda. Vazio/ausente vira null.
export const dataIsoOpcional = (mensagem: string) =>
  z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor),
    z
      .string({ error: mensagem })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: mensagem })
      .nullish()
      .transform((valor) => valor ?? null),
  );

// Data obrigatória no formato YYYY-MM-DD (o que o <input type="date"> manda).
export const dataIsoObrigatoria = (mensagem: string) =>
  z.string({ error: mensagem }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: mensagem });

// Hora obrigatória no formato HH:MM (o que o <input type="time"> manda).
export const horaObrigatoria = (mensagem: string) =>
  z.string({ error: mensagem }).regex(/^\d{2}:\d{2}(:\d{2})?$/, { error: mensagem });

// Arquivo enviado num multipart/form-data.
export const arquivoObrigatorio = (mensagem: string) => z.instanceof(File, { error: mensagem });

// Arquivo com conteúdo: um campo de upload vazio chega como File de 0 byte e vira null.
export const arquivoOpcional = z.preprocess(
  (valor) => (valor instanceof File && valor.size > 0 ? valor : null),
  z.instanceof(File).nullable(),
);

// Checkbox de formulário: o multipart manda o texto '1' quando está marcado.
export const marcado = z
  .string()
  .nullish()
  .transform((valor) => valor === '1');

// Campo que só aceita uma lista fechada de valores (sistema, status, tipo de acesso).
export const opcaoDe = <T extends readonly [string, ...string[]]>(valores: T, mensagem: string) =>
  z.enum(valores, { error: mensagem });

// --- leitura do corpo da requisição ---

export type Validado<T> = { dados: T; erro: null } | { dados: null; erro: Response };

function primeiraMensagem(erro: z.ZodError): string {
  const problema = erro.issues[0];
  // erro na raiz (corpo que nem chega a ser um objeto) não tem mensagem útil pra mostrar
  if (!problema || problema.path.length === 0) return 'Requisição inválida';
  return problema.message;
}

// Lê o corpo JSON e valida contra o schema.
// Uso: const { dados, erro } = await lerCorpo(request, Schema); if (erro) return erro;
export async function lerCorpo<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Validado<z.infer<S>>> {
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return { dados: null, erro: requisicaoInvalida() };
  }

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { dados: null, erro: requisicaoInvalida(primeiraMensagem(resultado.error)) };
  }

  return { dados: resultado.data, erro: null };
}

// Lê e valida a query string (?busca=...&categoria_id=...). Antes os filtros das listagens
// entravam no SQL sem nenhuma conferência.
export function lerConsulta<S extends z.ZodType>(
  request: Request,
  schema: S,
): Validado<z.infer<S>> {
  const resultado = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!resultado.success) {
    return { dados: null, erro: requisicaoInvalida(primeiraMensagem(resultado.error)) };
  }
  return { dados: resultado.data, erro: null };
}

// Valida um multipart/form-data contra o schema (uploads de certificado, anexos e prints).
export async function lerFormulario<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Validado<z.infer<S>>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { dados: null, erro: requisicaoInvalida() };
  }

  const resultado = schema.safeParse(Object.fromEntries(form.entries()));
  if (!resultado.success) {
    return { dados: null, erro: requisicaoInvalida(primeiraMensagem(resultado.error)) };
  }

  return { dados: resultado.data, erro: null };
}

// O :id da URL como número. Antes ele ia direto pro bind: /api/clientes/abc não achava
// nada e mesmo assim devolvia 200 { ok: true }.
export function idDaRota(
  params: Params<'id'>,
): { id: number; erro: null } | { id: null; erro: Response } {
  const bruto = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = Number(bruto);
  if (!bruto || !Number.isInteger(id) || id <= 0) {
    return { id: null, erro: requisicaoInvalida('Id inválido') };
  }
  return { id, erro: null };
}
