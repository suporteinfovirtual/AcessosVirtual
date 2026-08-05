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
  telefone?: string | null;
  observacoes?: string | null;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  licencas?: string | null;
  licencas_selecionadas?: Licenca[];
  licenca_ids?: number[];
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

export interface Licenca {
  id?: number;
  nome: string;
  criado_em?: string;
}

export interface ClienteRef {
  sistema: Sistema;
  ref_id: number;
  nome: string;
  cnpj?: string | null;
}

export interface Tecnico {
  id?: number;
  nome: string;
  criado_em?: string;
}

export interface Implantacao {
  id?: number;
  cliente_nome: string;
  cliente_sistema: Sistema;
  cliente_ref_id: number;
  data: string;
  hora: string;
  observacoes?: string | null;
  concluida_manual?: boolean | number;
  tecnico_id?: number | null;
  tecnico_nome?: string | null;
  criado_em?: string;
}

export type StatusNegociacao = 'em_negociacao' | 'desistiu' | 'fechou';

export const STATUS_NEGOCIACAO: { valor: StatusNegociacao; rotulo: string }[] = [
  { valor: 'em_negociacao', rotulo: 'Em negociação' },
  { valor: 'desistiu', rotulo: 'Desistiu' },
  { valor: 'fechou', rotulo: 'Fechou' },
];

export interface ClienteNegociacao {
  id?: number;
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  enquadramento_fiscal?: string | null;
  observacoes?: string | null;
  status?: StatusNegociacao;
  sistema?: Sistema | null;
  precisa_migrar_base?: boolean | number;
  motivo_desistencia?: string | null;
  convertido_em?: string | null;
  criado_em?: string;
}

// cliente com implantação concluída (e sem nenhuma outra pendente no futuro), pronto
// pra aparecer na lista de Faturamento
export interface ClientePendenteFaturamento {
  cliente_sistema: Sistema;
  cliente_ref_id: number;
  cliente_nome: string;
}

// cliente já marcado como faturado
export interface ClienteFaturado {
  id: number;
  cliente_sistema: Sistema;
  cliente_ref_id: number;
  cliente_nome: string;
  faturado_em: string;
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

export interface Arquivo {
  id?: number;
  nome_arquivo: string;
  titulo?: string | null;
  tipo?: string | null;
  tamanho?: number;
  criado_em?: string;
  atualizado_em?: string;
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
  telefone?: string | null;
  licencas?: string | null;
  licencas_selecionadas?: Licenca[];
  licenca_ids?: number[];
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
