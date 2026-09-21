import { anexarImagem } from '../../_lib/imagens';

// POST /api/passos/:id/imagens -> adiciona mais uma imagem (print) ao passo
export const onRequestPost = anexarImagem({ tabela: 'manual_passo_imagens', coluna: 'passo_id' });
