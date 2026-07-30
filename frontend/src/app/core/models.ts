export type TipoAcesso = 'anydesk' | 'acesso_web' | 'acesso_zeta';

export interface Acesso {
  id?: number;
  cliente_id?: number;
  tipo: TipoAcesso;
  identificador?: string | null;
  usuario?: string | null;
  senha?: string | null;
  link?: string | null;
  observacoes?: string | null;
  criado_em?: string;
}

export interface Cliente {
  id?: number;
  nome: string;
  cnpj?: string | null;
  observacoes?: string | null;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  criado_em?: string;
  acessos?: Acesso[];
}

export interface Categoria {
  id?: number;
  nome: string;
  criado_em?: string;
}

export interface ContaInterna {
  id?: number;
  servico: string;
  usuario?: string | null;
  senha?: string | null;
  observacoes?: string | null;
  criado_em?: string;
}

export const TIPOS_ACESSO: { valor: TipoAcesso; rotulo: string }[] = [
  { valor: 'anydesk', rotulo: 'AnyDesk' },
  { valor: 'acesso_web', rotulo: 'Acesso Web' },
  { valor: 'acesso_zeta', rotulo: 'Acesso Zeta' },
];
