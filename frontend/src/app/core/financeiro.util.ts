// Lucro = valor cobrado - custo; margem = lucro / valor cobrado (a forma mais comum de
// expressar "margem de lucro", em vez de markup sobre o custo).
export function calcularLucro(custo?: number | null, valor?: number | null): number | null {
  if (custo == null || valor == null) return null;
  return valor - custo;
}

export function calcularMargemPercentual(custo?: number | null, valor?: number | null): number | null {
  if (custo == null || valor == null || valor === 0) return null;
  return ((valor - custo) / valor) * 100;
}
