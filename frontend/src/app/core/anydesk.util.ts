import { Acesso } from './models';

// Abre o AnyDesk instalado já direcionado pro ID. Com senha cadastrada, vai pelo protocolo
// acessoanydesk:, tratado pelo ajudante local (scripts/anydesk-autoconectar), que digita a
// senha quando o AnyDesk pedir. Sem o ajudante instalado no PC o navegador não faz nada.
export function conectarAnydesk(acesso: Acesso) {
  if (!acesso.identificador) return;
  const id = acesso.identificador.replace(/\s+/g, '');
  if (!acesso.senha) {
    window.location.href = `anydesk:${id}`;
    return;
  }
  // base64url só pra senha sobreviver intacta na URL (não é proteção)
  const bytes = new TextEncoder().encode(acesso.senha);
  const senha = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  window.location.href = `acessoanydesk:${encodeURIComponent(id)}?s=${senha}`;
}
