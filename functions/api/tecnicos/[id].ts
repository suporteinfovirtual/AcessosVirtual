import { cadastroSimples } from '../_lib/cadastro-simples';

const tecnicos = cadastroSimples('tecnicos', 'Já existe um técnico com esse nome');

// PUT /api/tecnicos/:id -> renomeia o técnico
export const onRequestPut = tecnicos.renomear;

// DELETE /api/tecnicos/:id -> remove o técnico (implantações ligadas a ele ficam sem técnico)
export const onRequestDelete = tecnicos.remover;
