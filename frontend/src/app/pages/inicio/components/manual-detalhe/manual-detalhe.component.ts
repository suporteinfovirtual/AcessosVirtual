import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Manual, ManualPasso } from '../../../../core/models';
import { ManuaisService } from '../../../../core/manuais.service';
import { ManualModalComponent } from '../manual-modal/manual-modal.component';

@Component({
  selector: 'app-manual-detalhe',
  imports: [FormsModule, NgTemplateOutlet, ManualModalComponent],
  templateUrl: './manual-detalhe.component.html',
})
export class ManualDetalheComponent implements OnInit, OnDestroy {
  private manuaisService = inject(ManuaisService);

  manualId = input.required<number>();
  voltar = output<void>();
  removido = output<void>();

  manual = signal<Manual | null>(null);
  carregando = signal(true);

  modalManualAberto = signal(false);

  formPassoAberto = signal(false);
  passoEmEdicaoId = signal<number | null>(null);
  textoPasso = signal('');
  imagemPasso = signal<File | null>(null);
  imagemPreviewUrl = signal<string | null>(null);
  arquivoPasso = signal<File | null>(null);
  removerImagemPasso = signal(false);
  removerArquivoPasso = signal(false);
  salvandoPasso = signal(false);
  erroPasso = signal('');

  ngOnInit() {
    this.carregar();
  }

  ngOnDestroy() {
    this.limparPreviewImagem();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const manual = await firstValueFrom(this.manuaisService.obter(this.manualId()));
      this.manual.set(manual);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovoPasso() {
    this.passoEmEdicaoId.set(null);
    this.textoPasso.set('');
    this.limparPreviewImagem();
    this.arquivoPasso.set(null);
    this.removerImagemPasso.set(false);
    this.removerArquivoPasso.set(false);
    this.erroPasso.set('');
    this.formPassoAberto.set(true);
  }

  abrirEdicaoPasso(passo: ManualPasso) {
    this.passoEmEdicaoId.set(passo.id!);
    this.textoPasso.set(passo.texto || '');
    this.limparPreviewImagem();
    this.arquivoPasso.set(null);
    this.removerImagemPasso.set(false);
    this.removerArquivoPasso.set(false);
    this.erroPasso.set('');
    this.formPassoAberto.set(true);
  }

  cancelarPasso() {
    this.formPassoAberto.set(false);
    this.limparPreviewImagem();
  }

  passoEmEdicao(): ManualPasso | null {
    const id = this.passoEmEdicaoId();
    if (!id) return null;
    return this.manual()?.passos?.find((p) => p.id === id) || null;
  }

  aoSelecionarImagem(event: Event) {
    const input = event.target as HTMLInputElement;
    this.definirImagemPasso(input.files?.[0] || null);
  }

  // deixa colar um print direto (Ctrl+V) no textarea, sem precisar escolher o arquivo de imagem
  aoColarImagem(event: ClipboardEvent) {
    const itens = event.clipboardData?.items;
    if (!itens) return;

    for (const item of itens) {
      if (item.type.startsWith('image/')) {
        const arquivo = item.getAsFile();
        if (arquivo) {
          event.preventDefault();
          this.definirImagemPasso(arquivo);
        }
        break;
      }
    }
  }

  private definirImagemPasso(arquivo: File | null) {
    this.limparPreviewImagem();
    this.imagemPasso.set(arquivo);
    this.removerImagemPasso.set(false);
    if (arquivo) this.imagemPreviewUrl.set(URL.createObjectURL(arquivo));
  }

  private limparPreviewImagem() {
    const url = this.imagemPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.imagemPreviewUrl.set(null);
    this.imagemPasso.set(null);
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivoPasso.set(input.files?.[0] || null);
    this.removerArquivoPasso.set(false);
  }

  marcarRemoverImagem() {
    this.limparPreviewImagem();
    this.removerImagemPasso.set(true);
  }

  marcarRemoverArquivo() {
    this.arquivoPasso.set(null);
    this.removerArquivoPasso.set(true);
  }

  async salvarPasso() {
    const manual = this.manual();
    if (!manual || this.salvandoPasso()) return;

    const texto = this.textoPasso().trim();
    if (!texto && !this.imagemPasso() && !this.arquivoPasso()) {
      this.erroPasso.set('Escreva alguma coisa ou anexe um print/arquivo.');
      return;
    }

    this.salvandoPasso.set(true);
    this.erroPasso.set('');

    const passoId = this.passoEmEdicaoId();
    const ordemAtual = passoId ? manual.passos?.find((p) => p.id === passoId)?.ordem : undefined;
    const dados = {
      ordem: ordemAtual ?? (manual.passos?.length || 0) + 1,
      texto,
      imagem: this.imagemPasso(),
      arquivo: this.arquivoPasso(),
      removerImagem: this.removerImagemPasso(),
      removerArquivo: this.removerArquivoPasso(),
    };

    try {
      if (passoId) {
        await firstValueFrom(this.manuaisService.atualizarPasso(passoId, dados));
      } else {
        await firstValueFrom(this.manuaisService.adicionarPasso(manual.id!, dados));
      }
      this.formPassoAberto.set(false);
      this.limparPreviewImagem();
      await this.carregar();
    } catch {
      this.erroPasso.set('Não foi possível salvar o passo.');
    } finally {
      this.salvandoPasso.set(false);
    }
  }

  async removerPasso(passo: ManualPasso) {
    if (!passo.id || !confirm('Remover esse passo?')) return;
    await firstValueFrom(this.manuaisService.removerPasso(passo.id));
    await this.carregar();
  }

  async moverPasso(passo: ManualPasso, direcao: -1 | 1) {
    const passos = this.manual()?.passos;
    if (!passos) return;
    const index = passos.findIndex((p) => p.id === passo.id);
    const alvo = passos[index + direcao];
    if (!alvo || !passo.id || !alvo.id) return;

    await Promise.all([
      firstValueFrom(this.manuaisService.atualizarPasso(passo.id, { ordem: alvo.ordem, texto: passo.texto || '' })),
      firstValueFrom(this.manuaisService.atualizarPasso(alvo.id, { ordem: passo.ordem, texto: alvo.texto || '' })),
    ]);
    await this.carregar();
  }

  abrirEdicaoManual() {
    this.modalManualAberto.set(true);
  }

  fecharModalManual() {
    this.modalManualAberto.set(false);
  }

  async aoSalvarManual() {
    this.fecharModalManual();
    try {
      await this.carregar();
    } catch {
      this.removido.emit();
    }
  }

  async baixarArquivoPasso(passo: ManualPasso) {
    if (!passo.id) return;
    const blob = await firstValueFrom(this.manuaisService.baixarArquivoPasso(passo.id));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = passo.arquivo_nome || 'arquivo';
    link.click();
    URL.revokeObjectURL(url);
  }
}
