import { rotasDeCertificado } from '../../_lib/certificados';

const certificado = rotasDeCertificado({
  tabela: 'certificados_sistemas',
  coluna: 'cliente_sistema_id',
});

// GET /api/clientes-sistemas/:id/certificado -> baixa o arquivo .pfx do cliente
export const onRequestGet = certificado.baixar;

// POST /api/clientes-sistemas/:id/certificado -> envia (ou substitui) o certificado do cliente
export const onRequestPost = certificado.enviar;
