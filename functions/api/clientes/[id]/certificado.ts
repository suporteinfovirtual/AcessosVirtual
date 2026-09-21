import { rotasDeCertificado } from '../../_lib/certificados';

const certificado = rotasDeCertificado({ tabela: 'certificados', coluna: 'cliente_id' });

// GET /api/clientes/:id/certificado -> baixa o arquivo .pfx do cliente
export const onRequestGet = certificado.baixar;

// POST /api/clientes/:id/certificado -> envia (ou substitui) o certificado do cliente
export const onRequestPost = certificado.enviar;
