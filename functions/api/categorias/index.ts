import { cadastroSimples } from '../_lib/cadastro-simples';

const categorias = cadastroSimples('categorias', 'Já existe uma categoria com esse nome');

// GET /api/categorias -> lista todas as categorias
export const onRequestGet = categorias.listar;

// POST /api/categorias -> cria uma categoria nova
export const onRequestPost = categorias.criar;
