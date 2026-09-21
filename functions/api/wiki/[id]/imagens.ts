import { anexarImagem } from '../../_lib/imagens';

// POST /api/wiki/:id/imagens -> adiciona mais uma imagem (print do erro) ao artigo
export const onRequestPost = anexarImagem({ tabela: 'wiki_artigo_imagens', coluna: 'artigo_id' });
