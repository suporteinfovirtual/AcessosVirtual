export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

// formata progressivamente enquanto o usuário digita: (47) 9 3333-6633
export function formatarTelefone(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);

  if (digitos.length <= 2) return digitos ? `(${digitos}` : '';

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (resto.length <= 1) return `(${ddd}) ${resto}`;

  const nono = resto.slice(0, 1);
  const numero = resto.slice(1);

  if (numero.length <= 4) return `(${ddd}) ${nono} ${numero}`;
  return `(${ddd}) ${nono} ${numero.slice(0, 4)}-${numero.slice(4, 8)}`;
}
