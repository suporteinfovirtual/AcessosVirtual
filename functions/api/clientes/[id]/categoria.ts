import { trocarCategoria } from '../../_lib/categoria';

// PUT /api/clientes/:id/categoria -> troca só a categoria do cliente
export const onRequestPut = trocarCategoria('clientes');
