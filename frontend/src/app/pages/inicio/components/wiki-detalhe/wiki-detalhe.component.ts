import { Component, HostListener, OnInit, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WikiArtigo } from '../../../../core/models';
import { WikiService } from '../../../../core/wiki.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { WikiModalComponent } from '../wiki-modal/wiki-modal.component';

@Component({
  selector: 'app-wiki-detalhe',
  imports: [WikiModalComponent],
  templateUrl: './wiki-detalhe.component.html',
})
export class WikiDetalheComponent implements OnInit {
  private wikiService = inject(WikiService);
  private confirmService = inject(ConfirmService);

  artigoId = input.required<number>();
  voltar = output<void>();
  removido = output<void>();

  artigo = signal<WikiArtigo | null>(null);
  carregando = signal(true);

  modalAberto = signal(false);

  enviandoImagem = signal(false);
  erroImagem = signal('');

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const artigo = await firstValueFrom(this.wikiService.obter(this.artigoId()));
      this.artigo.set(artigo);
    } finally {
      this.carregando.set(false);
    }
  }

  // colar (Ctrl+V) um print funciona em qualquer lugar enquanto o artigo estiver aberto
  @HostListener('document:paste', ['$event'])
  async aoColarImagem(event: ClipboardEvent) {
    const itens = event.clipboardData?.items;
    if (!itens) return;

    for (const item of itens) {
      if (item.type.startsWith('image/')) {
        const arquivo = item.getAsFile();
        if (arquivo) {
          event.preventDefault();
          await this.enviarImagem(arquivo);
        }
        break;
      }
    }
  }

  aoArrastarSobre(event: DragEvent) {
    event.preventDefault();
  }

  async aoSoltarImagem(event: DragEvent) {
    event.preventDefault();
    const arquivos = event.dataTransfer?.files;
    if (!arquivos) return;

    for (const arquivo of Array.from(arquivos)) {
      if (arquivo.type.startsWith('image/')) await this.enviarImagem(arquivo);
    }
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (arquivo) this.enviarImagem(arquivo);
    input.value = '';
  }

  private async enviarImagem(arquivo: File) {
    const artigo = this.artigo();
    if (!artigo?.id) return;

    this.enviandoImagem.set(true);
    this.erroImagem.set('');
    try {
      await firstValueFrom(this.wikiService.adicionarImagem(artigo.id, arquivo));
      await this.carregar();
    } catch {
      this.erroImagem.set('Não foi possível enviar a imagem.');
    } finally {
      this.enviandoImagem.set(false);
    }
  }

  async removerImagem(imagemId: number) {
    if (!(await this.confirmService.confirmar('Remover essa imagem?'))) return;
    await firstValueFrom(this.wikiService.removerImagem(imagemId));
    await this.carregar();
  }

  abrirEdicao() {
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
  }

  async aoSalvar() {
    this.fecharModal();
    try {
      await this.carregar();
    } catch {
      this.removido.emit();
    }
  }
}
