import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    @if (variante() === 'linhas') {
      <div class="flex flex-col gap-2">
        @for (item of itens(); track $index) {
          <div class="h-10 animate-pulse rounded-lg bg-zinc-900/70"></div>
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (item of itens(); track $index) {
          <div class="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div class="h-3.5 w-2/3 rounded bg-zinc-800"></div>
            <div class="mt-2 h-2.5 w-1/3 rounded bg-zinc-800/70"></div>
            <div class="mt-4 space-y-2 border-t border-zinc-800 pt-3">
              <div class="h-2.5 w-1/4 rounded bg-zinc-800/70"></div>
              <div class="h-3 w-3/4 rounded bg-zinc-800"></div>
              <div class="h-2.5 w-1/4 rounded bg-zinc-800/70"></div>
              <div class="h-3 w-1/2 rounded bg-zinc-800"></div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SkeletonComponent {
  variante = input<'cartoes' | 'linhas'>('cartoes');
  quantidade = input(6);

  itens(): number[] {
    return Array.from({ length: this.quantidade() });
  }
}
