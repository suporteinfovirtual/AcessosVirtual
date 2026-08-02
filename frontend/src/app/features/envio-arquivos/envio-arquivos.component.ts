import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/card.component';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-envio-arquivos',
  imports: [FormsModule, CardComponent],
  templateUrl: './envio-arquivos.component.html',
})
export class EnvioArquivosComponent {
  arquivos = signal<File[]>([]);
  email = signal('');
  arrastando = signal(false);

  emailValido = computed(() => EMAIL_REGEX.test(this.email().trim()));
  podeEnviar = computed(() => this.arquivos().length > 0 && this.emailValido());

  aoSelecionarArquivos(event: Event) {
    const input = event.target as HTMLInputElement;
    this.adicionarArquivos(input.files);
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
    this.adicionarArquivos(event.dataTransfer?.files);
  }

  private adicionarArquivos(lista: FileList | null | undefined) {
    const novos = Array.from(lista ?? []);
    if (novos.length > 0) {
      this.arquivos.update((atuais) => [...atuais, ...novos]);
    }
  }

  removerArquivo(indice: number) {
    this.arquivos.update((atuais) => atuais.filter((_, i) => i !== indice));
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  enviarEmail() {
    if (!this.podeEnviar()) return;
    console.log('Enviar e-mail', { destinatario: this.email(), arquivos: this.arquivos() });
    // TODO: conectar com o endpoint /api/enviar-email depois que o Resend estiver configurado
  }
}
