export type TipoAcesso = 'anydesk' | 'acesso_web' | 'acesso_zeta';

export interface Acesso {
  id?: number;
  cliente_id?: number;
  tipo: TipoAcesso;
  identificador?: string | null;
  usuario?: string | null;
  senha?: string | null;
  link?: string | null;
  servidor?: string | null;
  contabilidade_id?: number | null;
  contabilidade_nome?: string | null;
  contabilidade_email?: string | null;
  observacoes?: string | null;
  criado_em?: string;
}

export interface CertificadoDigital {
  nome_arquivo: string;
  senha?: string | null;
  validade?: string | null;
  atualizado_em?: string;
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
  certificado?: CertificadoDigital | null;
}

export interface Categoria {
  id?: number;
  nome: string;
  criado_em?: string;
}

export interface Contabilidade {
  id?: number;
  nome: string;
  email?: string | null;
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

export interface LinkPessoal {
  id?: number;
  titulo: string;
  url: string;
  criado_em?: string;
}

export interface ManualPasso {
  id?: number;
  manual_id?: number;
  ordem: number;
  texto?: string | null;
  imagem_nome?: string | null;
  tem_imagem?: boolean | number;
  arquivo_nome?: string | null;
  criado_em?: string;
}

export interface Manual {
  id?: number;
  titulo: string;
  descricao?: string | null;
  total_passos?: number;
  criado_em?: string;
  passos?: ManualPasso[];
}

export const TIPOS_ACESSO: { valor: TipoAcesso; rotulo: string }[] = [
  { valor: 'anydesk', rotulo: 'AnyDesk' },
  { valor: 'acesso_web', rotulo: 'Acesso Web' },
  { valor: 'acesso_zeta', rotulo: 'Acesso Zeta' },
];
