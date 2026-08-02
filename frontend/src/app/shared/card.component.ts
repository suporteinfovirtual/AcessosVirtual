import { Component, input } from '@angular/core';

// Wrapper visual compartilhado (vidro fosco + borda sutil), usado nos painéis do sistema.
@Component({
  selector: 'app-card',
  template: `
    <div [class]="'bg-zinc-900/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg shadow-black/30 ' + padding()">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  padding = input('p-4');
}
