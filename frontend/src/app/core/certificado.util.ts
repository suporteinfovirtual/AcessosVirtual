import * as forge from 'node-forge';

// lê o .pfx no navegador (sem enviar a senha pra ninguém além do próprio upload) e devolve a data de validade do certificado
export async function lerValidadeCertificado(arquivo: File, senha: string): Promise<Date> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const binario = forge.util.binary.raw.encode(bytes);

  let asn1: forge.asn1.Asn1;
  try {
    asn1 = forge.asn1.fromDer(binario);
  } catch {
    throw new Error('Arquivo de certificado inválido.');
  }

  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha);
  } catch {
    throw new Error('Senha do certificado incorreta.');
  }

  const oidCertBag = forge.pki.oids['certBag'];
  const bags = p12.getBags({ bagType: oidCertBag });
  const certBag = bags[oidCertBag]?.[0];
  if (!certBag?.cert) {
    throw new Error('Não foi possível encontrar o certificado dentro do arquivo.');
  }

  return certBag.cert.validity.notAfter;
}

export function paraDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}
