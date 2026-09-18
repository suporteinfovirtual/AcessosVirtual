import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Arquivo } from '../../../../core/models';
import { ArquivosService } from '../../../../core/arquivos.service';
import { CardComponent } from '../../../../shared/card.component';
import { ToastService } from '../../../../shared/toast.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { ViewModeService } from '../../../../shared/view-mode.service';
import { SkeletonComponent } from '../../../../shared/skeleton.component';
import { aoSincronizar } from '../../../../core/sincronizacao.service';

interface Pendente {
  file: File;
  titulo: string;
}

@Component({
  selector: 'app-arquivos-panel',
  imports: [FormsModule, CardComponent, SkeletonComponent],
  templateUrl: './arquivos-panel.component.html',
})
export class ArquivosPanelComponent implements OnInit {
  private arquivosService = inject(ArquivosService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  viewMode = inject(ViewModeService);

  busca = input('');

  // A função lê o upload inteiro na memória (formData) antes de mandar pro R2, e o
  // isolate do Worker tem ~128 MB. 25 MB é uma margem segura.
  private readonly limiteBytes = 25 * 1024 * 1024;

  arquivos = signal<Arquivo[]>([]);
  carregando = signal(false);
  enviando = signal(false);
  arrastando = signal(false);
  substituindoId = signal<number | null>(null);

  pendentes = signal<Pendente[]>([]);

  editandoId = signal<number | null>(null);
  tituloEdicao = signal('');

  arquivosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.arquivos();
    return this.arquivos().filter(
      (a) => a.nome_arquivo.toLowerCase().includes(termo) || (a.titulo || '').toLowerCase().includes(termo)
    );
  });

  // recarrega quando outro computador grava algo, sem F5
  private readonly sincronizar = aoSincronizar(() => this.carregar(true));

  ngOnInit() {
    this.carregar();
  }

  async carregar(silencioso = false) {
    if (!silencioso) this.carregando.set(true);
    try {
      const arquivos = await firstValueFrom(this.arquivosService.listar());
      this.arquivos.set(arquivos);
    } finally {
      this.carregando.set(false);
    }
  }

  aoSelecionarArquivos(event: Event) {
    const input = event.target as HTMLInputElement;
    this.adicionarPendentes(input.files);
    input.value = '';
  }

  aoArrastarSobre(event: DragEvent) {
    event.preventDefault();
    this.arrastando.set(true);
  }

  aoSairArraste(event: DragEvent) {
    event.preventDefault();
    this.arrastando.set(false);
  }

  aoSoltarArquivos(event: DragEvent) {
    event.preventDefault();
    this.arrastando.set(false);
    this.adicionarPendentes(event.dataTransfer?.files);
  }

  private adicionarPendentes(lista: FileList | null | undefined) {
    const todos = Array.from(lista ?? []);
    const grandes = todos.filter((file) => file.size > this.limiteBytes);
    const novos = todos.filter((file) => file.size <= this.limiteBytes).map((file) => ({ file, titulo: '' }));

    if (grandes.length > 0) {
      const nomes = grandes.map((f) => f.name).join(', ');
      this.toast.erro(`Acima do limite de ${this.formatarTamanho(this.limiteBytes)}: ${nomes}`);
    }
    if (novos.length > 0) {
      this.pendentes.update((atuais) => [...atuais, ...novos]);
    }
  }

  removerPendente(indice: number) {
    this.pendentes.update((atuais) => atuais.filter((_, i) => i !== indice));
  }

  async enviarPendentes() {
    const pendentes = this.pendentes();
    if (pendentes.length === 0 || this.enviando()) return;

    this.enviando.set(true);
    try {
      for (const pendente of pendentes) {
        await firstValueFrom(this.arquivosService.enviar(pendente.file, pendente.titulo.trim() || null));
      }
      this.pendentes.set([]);
      await this.carregar();
      this.toast.sucesso(pendentes.length === 1 ? 'Arquivo enviado.' : 'Arquivos enviados.');
    } catch {
      this.toast.erro('Não foi possível enviar o arquivo.');
    } finally {
      this.enviando.set(false);
    }
  }

  async aoSubstituir(arquivo: Arquivo, event: Event) {
    const input = event.target as HTMLInputElement;
    const novo = input.files?.[0];
    input.value = '';
    if (!novo || !arquivo.id) return;

    if (novo.size > this.limiteBytes) {
      this.toast.erro(`Arquivo acima do limite de ${this.formatarTamanho(this.limiteBytes)}.`);
      return;
    }

    this.substituindoId.set(arquivo.id);
    try {
      await firstValueFrom(this.arquivosService.substituir(arquivo.id, novo));
      await this.carregar();
      this.toast.sucesso('Arquivo substituído.');
    } catch {
      this.toast.erro('Não foi possível substituir o arquivo.');
    } finally {
      this.substituindoId.set(null);
    }
  }

  iniciarEdicaoTitulo(arquivo: Arquivo) {
    if (!arquivo.id) return;
    this.editandoId.set(arquivo.id);
    this.tituloEdicao.set(arquivo.titulo || '');
  }

  cancelarEdicaoTitulo() {
    this.editandoId.set(null);
  }

  async salvarTitulo(arquivo: Arquivo) {
    if (!arquivo.id) return;
    const titulo = this.tituloEdicao().trim() || null;
    try {
      await firstValueFrom(this.arquivosService.renomear(arquivo.id, titulo));
      this.arquivos.update((lista) => lista.map((a) => (a.id === arquivo.id ? { ...a, titulo } : a)));
      this.editandoId.set(null);
    } catch {
      this.toast.erro('Não foi possível renomear o arquivo.');
    }
  }

  async baixar(arquivo: Arquivo) {
    if (!arquivo.id) return;
    try {
      const blob = await firstValueFrom(this.arquivosService.baixar(arquivo.id));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = arquivo.nome_arquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toast.erro('Não foi possível baixar o arquivo.');
    }
  }

  async remover(arquivo: Arquivo) {
    const nome = arquivo.titulo || arquivo.nome_arquivo;
    if (!arquivo.id) return;
    if (!(await this.confirmService.confirmar(`Excluir "${nome}"?`))) return;
    await firstValueFrom(this.arquivosService.remover(arquivo.id));
    await this.carregar();
    this.toast.sucesso('Arquivo excluído.');
  }

  formatarTamanho(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}
