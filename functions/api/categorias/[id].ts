import { cadastroSimples } from '../_lib/cadastro-simples';

const categorias = cadastroSimples('categorias', 'Já existe uma categoria com esse nome');

// PUT /api/categorias/:id -> renomeia a categoria
export const onRequestPut = categorias.renomear;

// DELETE /api/categorias/:id -> remove a categoria (clientes ligados a ela ficam sem categoria)
export const onRequestDelete = categorias.remover;
