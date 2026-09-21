import { z } from 'zod';
import { SISTEMAS, TIPOS_ACESSO } from './dominio';
import {
  dataIsoObrigatoria,
  flag,
  horaObrigatoria,
  idObrigatorio,
  idOpcional,
  numeroOpcional,
  opcaoDe,
  textoObrigatorio,
  textoOpcional,
  textoOpcionalCru,
} from './validacao';

// Schemas usados por mais de uma rota — tipicamente o mesmo corpo no POST e no PUT de uma
// entidade. Os de rota única ficam no próprio arquivo dela.

// Campos de um acesso (anydesk / acesso_web / acesso_zeta), sem o tipo: aparecem iguais ao
// criar o cliente, ao adicionar um acesso e ao editar um acesso existente.
export const camposDeAcesso = {
  identificador: textoOpcional,
  usuario: textoOpcional,
  senha: textoOpcionalCru,
  link: textoOpcional,
  servidor: textoOpcional,
  contabilidade_id: idOpcional('Contabilidade inválida'),
  enviar_contabilidade: flag,
  observacoes: textoOpcional,
};

// Acesso completo, como vem aninhado na criação de um cliente.
export const AcessoCompleto = z.object({
  tipo: opcaoDe(TIPOS_ACESSO, 'Tipo de acesso inválido'),
  ...camposDeAcesso,
});

export const Contabilidade = z.object({
  nome: textoObrigatorio('Nome é obrigatório'),
  email: textoOpcional,
});

export const Link = z.object({
  titulo: textoObrigatorio('Título e link são obrigatórios'),
  url: textoObrigatorio('Título e link são obrigatórios'),
});

export const ContaInterna = z.object({
  servico: textoObrigatorio('Nome do serviço é obrigatório'),
  usuario: textoOpcional,
  senha: textoOpcionalCru,
  observacoes: textoOpcional,
});

export const Manual = z.object({
  titulo: textoObrigatorio('Título é obrigatório'),
  descricao: textoOpcional,
});

export const ArtigoWiki = z.object({
  titulo: textoObrigatorio('Título é obrigatório'),
  codigo: textoOpcional,
  mensagem_erro: textoOpcional,
  causa: textoOpcional,
  solucao: textoOpcional,
});

// Posição de um passo dentro do manual. Vem de um multipart, então chega como texto.
export const ordem = z.preprocess(
  (valor) => (valor === '' || valor === null || valor === undefined ? 0 : Number(valor)),
  z
    .number({ error: 'Ordem inválida' })
    .int({ error: 'Ordem inválida' })
    .min(0, { error: 'Ordem inválida' }),
);

// Vínculo com a lista de licenças. Ausente (undefined) quer dizer "não mexe nas licenças";
// uma lista vazia quer dizer "tira todas". As rotas dependem dessa diferença.
const licenca_ids = z.array(idObrigatorio('Licença inválida')).optional();

// Cadastro unificado de cliente, igual no POST e no PUT.
export const camposDeCliente = {
  nome: textoObrigatorio('Nome é obrigatório'),
  cnpj: textoOpcional,
  telefone: textoOpcional,
  observacoes: textoOpcional,
  categoria_id: idOpcional('Categoria inválida'),
  licencas: textoOpcional,
  enquadramento_fiscal: textoOpcional,
  custo_mensalidade: numeroOpcional('Custo da mensalidade deve ser um número'),
  valor_mensalidade: numeroOpcional('Valor da mensalidade deve ser um número'),
  licenca_ids,
};

// Cadastro de cliente por sistema (uniplus / sgbr). O sistema em si só entra na criação.
export const camposDeClienteSistema = {
  nome: textoObrigatorio('Nome é obrigatório'),
  cnpj: textoOpcional,
  telefone: textoOpcional,
  licencas: textoOpcional,
  enquadramento_fiscal: textoOpcional,
  versao_build: textoOpcional,
  observacoes: textoOpcional,
  custo_mensalidade: numeroOpcional('Custo da mensalidade deve ser um número'),
  valor_mensalidade: numeroOpcional('Valor da mensalidade deve ser um número'),
  categoria_id: idOpcional('Categoria inválida'),
  licenca_ids,
};

// Agendamento de implantação, igual no POST e no PUT (que ainda acrescenta concluida_manual).
export const camposDeImplantacao = {
  cliente_nome: textoObrigatorio('Cliente é obrigatório'),
  cliente_sistema: opcaoDe(SISTEMAS, 'Sistema inválido'),
  cliente_ref_id: idObrigatorio('Cliente é obrigatório'),
  data: dataIsoObrigatoria('Data e hora são obrigatórias'),
  hora: horaObrigatoria('Data e hora são obrigatórias'),
  observacoes: textoOpcional,
  tecnico_id: idOpcional('Técnico inválido'),
};

// Cliente em negociação, igual no POST e no PUT (que acrescenta status e conversão).
export const camposDeNegociacao = {
  nome: textoObrigatorio('Nome é obrigatório'),
  cnpj: textoOpcional,
  telefone: textoOpcional,
  email: textoOpcional,
  aliquota: textoOpcional,
  enquadramento_fiscal: textoOpcional,
  observacoes: textoOpcional,
  sistema: opcaoDe(SISTEMAS, 'Sistema inválido').nullish(),
  precisa_migrar_base: flag,
  categoria_id: idOpcional('Categoria inválida'),
};

// Troca só a categoria (a tela de Instalação não tem os outros campos pra mandar no PUT completo).
export const TrocaDeCategoria = z.object({
  categoria_id: idOpcional('Categoria inválida'),
});
