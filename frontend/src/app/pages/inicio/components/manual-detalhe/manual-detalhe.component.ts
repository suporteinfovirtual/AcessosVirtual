import { Component, HostListener, OnInit, inject, input, output, signal } from '@angular/core';
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
export class ManualDetalheComponent implements OnInit {
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
  arquivoPasso = signal<File | null>(null);
  removerArquivoPasso = signal(false);
  salvandoPasso = signal(false);
  erroPasso = signal('');

  enviandoImagem = signal(false);
  erroImagem = signal('');

  ngOnInit() {
    this.carregar();
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
    this.arquivoPasso.set(null);
    this.removerArquivoPasso.set(false);
    this.erroPasso.set('');
    this.erroImagem.set('');
    this.formPassoAberto.set(true);
  }

  abrirEdicaoPasso(passo: ManualPasso) {
    this.passoEmEdicaoId.set(passo.id!);
    this.textoPasso.set(passo.texto || '');
    this.arquivoPasso.set(null);
    this.removerArquivoPasso.set(false);
    this.erroPasso.set('');
    this.erroImagem.set('');
    this.formPassoAberto.set(true);
  }

  cancelarPasso() {
    this.formPassoAberto.set(false);
  }

  passoEmEdicao(): ManualPasso | null {
    const id = this.passoEmEdicaoId();
    if (!id) return null;
    return this.manual()?.passos?.find((p) => p.id === id) || null;
  }

  // colar (Ctrl+V) funciona em qualquer lugar enquanto o formulário do passo estiver aberto
  @HostListener('document:paste', ['$event'])
  async aoColarImagem(event: ClipboardEvent) {
    if (!this.formPassoAberto()) return;

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

  // deixa arrastar e soltar uma ou mais imagens direto na caixa de texto do passo
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

  private async enviarImagem(arquivo: File) {
    const passoId = this.passoEmEdicaoId();
    if (!passoId) {
      this.erroPasso.set('Salve o passo primeiro pra poder adicionar imagens.');
      return;
    }

    this.enviandoImagem.set(true);
    this.erroImagem.set('');
    try {
      await firstValueFrom(this.manuaisService.adicionarImagemPasso(passoId, arquivo));
      await this.carregar();
    } catch {
      this.erroImagem.set('Não foi possível enviar a imagem.');
    } finally {
      this.enviandoImagem.set(false);
    }
  }

  async removerImagemDoPasso(imagemId: number) {
    if (!confirm('Remover essa imagem?')) return;
    await firstValueFrom(this.manuaisService.removerImagemPasso(imagemId));
    await this.carregar();
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivoPasso.set(input.files?.[0] || null);
    this.removerArquivoPasso.set(false);
  }

  marcarRemoverArquivo() {
    this.arquivoPasso.set(null);
    this.removerArquivoPasso.set(true);
  }

  async salvarPasso() {
    const manual = this.manual();
    if (!manual || this.salvandoPasso()) return;

    const texto = this.textoPasso().trim();
    const passoId = this.passoEmEdicaoId();
    if (!texto && !this.arquivoPasso() && !passoId) {
      this.erroPasso.set('Escreva alguma coisa ou anexe um arquivo.');
      return;
    }

    this.salvandoPasso.set(true);
    this.erroPasso.set('');

    const ordemAtual = passoId ? manual.passos?.find((p) => p.id === passoId)?.ordem : undefined;
    const dados = {
      ordem: ordemAtual ?? (manual.passos?.length || 0) + 1,
      texto,
      arquivo: this.arquivoPasso(),
      removerArquivo: this.removerArquivoPasso(),
    };

    try {
      if (passoId) {
        await firstValueFrom(this.manuaisService.atualizarPasso(passoId, dados));
      } else {
        const resultado = await firstValueFrom(this.manuaisService.adicionarPasso(manual.id!, dados));
        // continua no modo edição do passo recém-criado, pra já poder colar imagens nele
        this.passoEmEdicaoId.set(resultado.id);
      }
      this.arquivoPasso.set(null);
      this.removerArquivoPasso.set(false);
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
