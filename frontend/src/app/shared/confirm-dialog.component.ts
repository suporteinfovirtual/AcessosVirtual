import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirmService.estado(); as estado) {
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        (click)="confirmService.responder(false)"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40"
          (click)="$event.stopPropagation()"
        >
          <p class="text-sm text-zinc-200">{{ estado.mensagem }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
              (click)="confirmService.responder(false)"
            >
              Cancelar
            </button>
            <button
              type="button"
              [class]="estado.perigo
                ? 'rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500'
                : 'rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-accent-hover'"
              (click)="confirmService.responder(true)"
            >
              {{ estado.confirmarTexto }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);
}
