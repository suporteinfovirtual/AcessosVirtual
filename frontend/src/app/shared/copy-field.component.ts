import { Component, input, signal } from '@angular/core';

// Campo discreto com valor + botão de copiar, usado nos cartões de acesso.
@Component({
  selector: 'app-copy-field',
  template: `
    @if (valor()) {
      <div class="flex items-center justify-between gap-2 group">
        <div class="min-w-0">
          <span class="block text-[11px] uppercase tracking-wide text-zinc-500">{{ rotulo() }}</span>
          <span class="block truncate text-sm text-zinc-200" [class.font-mono]="mono()">{{
            mascarado() ? '••••••••' : valor()
          }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          @if (mascaravel()) {
            <button
              type="button"
              class="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              (click)="mascarado.set(!mascarado())"
              [title]="mascarado() ? 'Mostrar' : 'Ocultar'"
            >
              @if (mascarado()) {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
              }
            </button>
          }
          <button
            type="button"
            class="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-accent"
            (click)="copiar()"
            title="Copiar"
          >
            @if (copiado()) {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 text-accent"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185.639-.075 1.281-.135 1.927-.184"/></svg>
            }
          </button>
        </div>
      </div>
    }
  `,
})
export class CopyFieldComponent {
  rotulo = input.required<string>();
  valor = input<string | null | undefined>();
  mascaravel = input(false);
  mono = input(false);

  mascarado = signal(false);
  copiado = signal(false);

  constructor() {
    // esconde por padrão se for um campo mascarável (ex: senha)
  }

  ngOnInit() {
    if (this.mascaravel()) this.mascarado.set(true);
  }

  async copiar() {
    const texto = this.valor();
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1500);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — ignora silenciosamente
    }
  }
}
