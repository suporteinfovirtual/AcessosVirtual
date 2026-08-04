import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Licenca } from '../../../../core/models';

@Component({
  selector: 'app-licencas-select',
  imports: [FormsModule],
  templateUrl: './licencas-select.component.html',
})
export class LicencasSelectComponent {
  disponiveis = input.required<Licenca[]>();
  selecionadas = input<number[]>([]);
  selecionadasChange = output<number[]>();

  busca = signal('');
  sugestoesAbertas = signal(false);

  licencasSelecionadas = computed(() => {
    const ids = this.selecionadas();
    return this.disponiveis().filter((l) => ids.includes(l.id!));
  });

  sugestoes = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const ids = new Set(this.selecionadas());
    const restantes = this.disponiveis().filter((l) => !ids.has(l.id!));
    const filtradas = termo ? restantes.filter((l) => l.nome.toLowerCase().includes(termo)) : restantes;
    return filtradas.slice(0, 30);
  });

  adicionar(licenca: Licenca) {
    this.selecionadasChange.emit([...this.selecionadas(), licenca.id!]);
    this.busca.set('');
  }

  remover(id: number) {
    this.selecionadasChange.emit(this.selecionadas().filter((x) => x !== id));
  }

  aoPressionarEnter() {
    const primeira = this.sugestoes()[0];
    if (primeira) this.adicionar(primeira);
  }

  fecharComAtraso() {
    // atraso pra permitir o (click) na sugestão disparar antes do blur fechar a lista
    setTimeout(() => this.sugestoesAbertas.set(false), 150);
  }
}
