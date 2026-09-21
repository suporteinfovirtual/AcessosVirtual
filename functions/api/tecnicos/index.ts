import { cadastroSimples } from '../_lib/cadastro-simples';

const tecnicos = cadastroSimples('tecnicos', 'Já existe um técnico com esse nome');

// GET /api/tecnicos -> lista todos os técnicos
export const onRequestGet = tecnicos.listar;

// POST /api/tecnicos -> cria um técnico novo
export const onRequestPost = tecnicos.criar;
