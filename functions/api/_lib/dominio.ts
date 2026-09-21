// Valores fechados do domínio, antes repetidos como arrays soltos em cada rota
// (SISTEMAS_VALIDOS aparecia em negociacao.ts, negociacao/[id].ts e instalacoes.ts).

// Todos os sistemas que um cliente pode usar.
export const SISTEMAS = ['uniplus', 'uniplus_web', 'sgbr', 'zeta'] as const;

// Sistemas com cadastro próprio na tabela clientes_sistemas. zeta e uniplus_web ficam de
// fora: usam direto clientes/acessos (unificados com Acesso Zeta / Acesso Web).
export const SISTEMAS_COM_CADASTRO_PROPRIO = ['uniplus', 'sgbr'] as const;

// Etapas da negociação.
export const STATUS_NEGOCIACAO = ['em_negociacao', 'desistiu', 'fechou'] as const;

// Tipos de acesso guardados na tabela acessos.
export const TIPOS_ACESSO = ['anydesk', 'acesso_web', 'acesso_zeta'] as const;

// Teto do upload da aba Ferramentas > Arquivos. A função lê o arquivo inteiro na memória
// antes de subir pro R2, e o isolate do Worker tem ~128 MB.
export const LIMITE_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ERRO_ACIMA_DO_LIMITE = 'Arquivo acima do limite de 25 MB';
