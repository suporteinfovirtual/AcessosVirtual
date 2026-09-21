import { trocarCategoria } from '../../_lib/categoria';

// PUT /api/clientes-sistemas/:id/categoria -> troca só a categoria do cliente
export const onRequestPut = trocarCategoria('clientes_sistemas');
