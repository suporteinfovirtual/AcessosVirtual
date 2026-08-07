export interface TrechoBusca {
  texto: string;
  destaque: boolean;
}

function escapaRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// quebra um texto em pedaços marcando quais batem com o termo buscado, pra destacar no template
export function destacarTrechos(texto: string, termo: string): TrechoBusca[] {
  const termoLimpo = termo.trim();
  if (!termoLimpo) return [{ texto, destaque: false }];

  const partes = texto.split(new RegExp(`(${escapaRegex(termoLimpo)})`, 'gi'));
  return partes.filter((p) => p !== '').map((parte) => ({ texto: parte, destaque: parte.toLowerCase() === termoLimpo.toLowerCase() }));
}

// pega um pedaço do texto ao redor da primeira ocorrência do termo, com reticências nas pontas
export function extrairTrecho(texto: string, termo: string, tamanho = 140): string {
  const termoLimpo = termo.trim().toLowerCase();
  if (!termoLimpo) return texto.length > tamanho ? texto.slice(0, tamanho) + '…' : texto;

  const indice = texto.toLowerCase().indexOf(termoLimpo);
  if (indice === -1) return texto.length > tamanho ? texto.slice(0, tamanho) + '…' : texto;

  const metade = Math.floor((tamanho - termoLimpo.length) / 2);
  const inicio = Math.max(0, indice - metade);
  const fim = Math.min(texto.length, indice + termoLimpo.length + metade);

  let trecho = texto.slice(inicio, fim);
  if (inicio > 0) trecho = '…' + trecho;
  if (fim < texto.length) trecho += '…';
  return trecho;
}
