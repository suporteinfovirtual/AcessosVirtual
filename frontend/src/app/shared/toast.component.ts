import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md transition"
          [class.border-accent/40]="toast.tipo === 'sucesso'"
          [class.bg-zinc-900/95]="toast.tipo === 'sucesso'"
          [class.text-zinc-100]="toast.tipo === 'sucesso'"
          [class.border-red-500/40]="toast.tipo === 'erro'"
          [class.bg-red-950/90]="toast.tipo === 'erro'"
          [class.text-red-200]="toast.tipo === 'erro'"
        >
          @if (toast.tipo === 'sucesso') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0 text-accent"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          }
          <span class="min-w-0 flex-1 truncate">{{ toast.mensagem }}</span>
          <button
            type="button"
            class="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            (click)="toastService.fechar(toast.id)"
            title="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
