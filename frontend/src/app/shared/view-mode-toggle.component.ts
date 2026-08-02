import { Component, inject } from '@angular/core';
import { ViewModeService } from './view-mode.service';

@Component({
  selector: 'app-view-mode-toggle',
  template: `
    <div class="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md transition"
        [class.bg-zinc-800]="viewMode.modo() === 'grade'"
        [class.text-accent]="viewMode.modo() === 'grade'"
        [class.text-zinc-500]="viewMode.modo() !== 'grade'"
        title="Visualização em grade"
        (click)="definir('grade')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75h6v6h-6v-6ZM14.25 3.75h6v6h-6v-6ZM3.75 14.25h6v6h-6v-6ZM14.25 14.25h6v6h-6v-6Z"/></svg>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-md transition"
        [class.bg-zinc-800]="viewMode.modo() === 'lista'"
        [class.text-accent]="viewMode.modo() === 'lista'"
        [class.text-zinc-500]="viewMode.modo() !== 'lista'"
        title="Visualização em lista compacta"
        (click)="definir('lista')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5"/></svg>
      </button>
    </div>
  `,
})
export class ViewModeToggleComponent {
  viewMode = inject(ViewModeService);

  definir(modo: 'grade' | 'lista') {
    if (this.viewMode.modo() !== modo) this.viewMode.alternar();
  }
}
