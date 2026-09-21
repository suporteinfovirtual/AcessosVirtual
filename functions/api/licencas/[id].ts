import { cadastroSimples } from '../_lib/cadastro-simples';

const licencas = cadastroSimples('licencas', 'Já existe uma licença com esse nome');

// PUT /api/licencas/:id -> renomeia a licença
export const onRequestPut = licencas.renomear;

// DELETE /api/licencas/:id -> remove a licença (clientes ligados a ela perdem o vínculo)
export const onRequestDelete = licencas.remover;
