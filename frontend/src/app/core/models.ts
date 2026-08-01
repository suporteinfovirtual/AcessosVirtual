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
  enviar_contabilidade?: boolean | number | null;
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
  licencas?: string | null;
  enquadramento_fiscal?: string | null;
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

export interface EnvioContabilidadeStatus {
  acesso_id: number;
  enviado: boolean | number;
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

export interface ManualPassoImagem {
  id: number;
  passo_id?: number;
  ordem?: number;
  imagem_nome?: string | null;
}

export interface ManualPasso {
  id?: number;
  manual_id?: number;
  ordem: number;
  texto?: string | null;
  imagens?: ManualPassoImagem[];
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

export type Sistema = 'uniplus' | 'uniplus_web' | 'sgbr' | 'zeta';

export interface ClienteSistema {
  id?: number;
  sistema: Sistema;
  nome: string;
  cnpj?: string | null;
  licencas?: string | null;
  enquadramento_fiscal?: string | null;
  versao_build?: string | null;
  observacoes?: string | null;
  criado_em?: string;
}

export const SISTEMAS: { valor: Sistema; rotulo: string; temVersaoBuild: boolean }[] = [
  { valor: 'uniplus', rotulo: 'Uniplus', temVersaoBuild: true },
  { valor: 'uniplus_web', rotulo: 'Uniplus Web', temVersaoBuild: false },
  { valor: 'sgbr', rotulo: 'SGBR', temVersaoBuild: false },
  { valor: 'zeta', rotulo: 'Zeta', temVersaoBuild: false },
];
