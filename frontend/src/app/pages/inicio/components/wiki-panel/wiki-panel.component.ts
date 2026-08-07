import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { WikiArtigo } from '../../../../core/models';
import { WikiService } from '../../../../core/wiki.service';
import { WikiModalComponent } from '../wiki-modal/wiki-modal.component';
import { WikiDetalheComponent } from '../wiki-detalhe/wiki-detalhe.component';
import { ToastService } from '../../../../shared/toast.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { TrechoBusca, destacarTrechos, extrairTrecho } from '../../../../core/busca.util';

type Ordenacao = 'relevancia' | 'recentes';

interface ResultadoWiki {
  artigo: WikiArtigo;
  pontuacao: number;
  campoTrecho: string;
}

@Component({
  selector: 'app-wiki-panel',
  imports: [FormsModule, WikiModalComponent, WikiDetalheComponent, SkeletonComponent],
  templateUrl: './wiki-panel.component.html',
})
export class WikiPanelComponent implements OnInit {
  private wikiService = inject(WikiService);
  private toast = inject(ToastService);

  busca = input('');

  artigos = signal<WikiArtigo[]>([]);
  carregando = signal(false);

  modalAberto = signal(false);
  artigoEmEdicao = signal<WikiArtigo | null>(null);

  artigoAbertoId = signal<number | null>(null);

  ordenacao = signal<Ordenacao>('relevancia');

  private resultados = computed<ResultadoWiki[]>(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.artigos();

    return lista
      .map((artigo) => {
        let pontuacao = 0;
        if (termo) {
          if (artigo.titulo.toLowerCase().includes(termo)) pontuacao += 4;
          if ((artigo.codigo || '').toLowerCase().includes(termo)) pontuacao += 4;
          if ((artigo.mensagem_erro || '').toLowerCase().includes(termo)) pontuacao += 2;
          if ((artigo.causa || '').toLowerCase().includes(termo)) pontuacao += 1;
          if ((artigo.solucao || '').toLowerCase().includes(termo)) pontuacao += 1;
        }

        // pega o primeiro campo que bateu com a busca pra mostrar como trecho; sem busca, só um resumo padrão
        const campoTrecho =
          [artigo.codigo, artigo.mensagem_erro, artigo.causa, artigo.solucao].find(
            (campo) => campo && campo.toLowerCase().includes(termo)
          ) ||
          artigo.causa ||
          artigo.solucao ||
          artigo.mensagem_erro ||
          '';

        return { artigo, pontuacao, campoTrecho };
      })
      .filter((r) => !termo || r.pontuacao > 0);
  });

  resultadosOrdenados = computed(() => {
    const lista = [...this.resultados()];
    if (this.ordenacao() === 'recentes') {
      return lista.sort((a, b) => (b.artigo.criado_em || '').localeCompare(a.artigo.criado_em || ''));
    }
    return lista.sort((a, b) => b.pontuacao - a.pontuacao || a.artigo.titulo.localeCompare(b.artigo.titulo));
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const artigos = await firstValueFrom(this.wikiService.listar());
      this.artigos.set(artigos);
    } finally {
      this.carregando.set(false);
    }
  }

  tituloDestacado(titulo: string): TrechoBusca[] {
    return destacarTrechos(titulo, this.busca());
  }

  trechoDestacado(texto: string): TrechoBusca[] {
    return destacarTrechos(extrairTrecho(texto, this.busca()), this.busca());
  }

  abrirArtigo(artigo: WikiArtigo) {
    this.artigoAbertoId.set(artigo.id!);
  }

  async voltarParaLista() {
    this.artigoAbertoId.set(null);
    await this.carregar();
  }

  abrirNovo() {
    this.artigoEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.artigoEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
    this.toast.sucesso('Artigo salvo.');
  }
}
