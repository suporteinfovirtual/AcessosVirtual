import { cadastroSimples } from '../_lib/cadastro-simples';

const licencas = cadastroSimples('licencas', 'Já existe uma licença com esse nome');

// GET /api/licencas -> lista todas as licenças
export const onRequestGet = licencas.listar;

// POST /api/licencas -> cria uma licença nova
export const onRequestPost = licencas.criar;
