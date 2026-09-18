import { Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CategoriasService } from '../core/categorias.service';
import { ContabilidadesService } from '../core/contabilidades.service';

export interface ItemCadastrado {
  id: number;
  nome: string;
  email?: string | null;
}

// Botão "+" que fica dentro de um <select> de contabilidade ou categoria e abre um
// cadastro rápido, sem sair da tela atual. Quem usa coloca o select num wrapper
// `relative` com `pr-14` e trata (criado): adiciona o item na lista e já seleciona.
@Component({
  selector: 'app-cadastro-rapido',
  host: { class: 'absolute inset-y-0 right-7 flex items-center' },
  template: `
    <button
      type="button"
      class="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-accent"
      [title]="tipo() === 'contabilidade' ? 'Cadastrar nova contabilidade' : 'Cadastrar nova categoria'"
      (click)="abrir()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    </button>

    @if (aberto()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
        <div class="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
          <h3 class="text-base font-semibold text-zinc-100">
            {{ tipo() === 'contabilidade' ? 'Nova contabilidade' : 'Nova categoria' }}
          </h3>

          <div class="mt-4 space-y-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-zinc-300">Nome*</label>
              <input
                #campoNome
                [value]="nome()"
                (input)="nome.set(campoNome.value)"
                (keydown.enter)="$event.preventDefault(); salvar()"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>
            @if (tipo() === 'contabilidade') {
              <div>
                <label class="mb-1.5 block text-sm font-medium text-zinc-300">E-mail</label>
                <input
                  #campoEmail
                  type="email"
                  [value]="email()"
                  (input)="email.set(campoEmail.value)"
                  (keydown.enter)="$event.preventDefault(); salvar()"
                  placeholder="contabilidade@empresa.com.br"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>
            }
          </div>

          @if (erro()) {
            <p class="mt-3 text-sm text-red-400">{{ erro() }}</p>
          }

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
              (click)="aberto.set(false)"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="!nome().trim() || salvando()"
              class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              (click)="salvar()"
            >
              {{ salvando() ? 'Salvando…' : 'Cadastrar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CadastroRapidoComponent {
  private contabilidadesService = inject(ContabilidadesService);
  private categoriasService = inject(CategoriasService);

  tipo = input.required<'contabilidade' | 'categoria'>();
  criado = output<ItemCadastrado>();

  aberto = signal(false);
  nome = signal('');
  email = signal('');
  salvando = signal(false);
  erro = signal('');

  abrir() {
    this.nome.set('');
    this.email.set('');
    this.erro.set('');
    this.aberto.set(true);
  }

  async salvar() {
    const nome = this.nome().trim();
    if (!nome || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');
    try {
      const item: ItemCadastrado =
        this.tipo() === 'contabilidade'
          ? await firstValueFrom(this.contabilidadesService.criar({ nome, email: this.email().trim() || null }))
          : await firstValueFrom(this.categoriasService.criar({ nome }));
      this.criado.emit(item);
      this.aberto.set(false);
    } catch (e) {
      // ex.: 409 "Já existe uma categoria com esse nome"
      this.erro.set((e as { error?: { erro?: string } })?.error?.erro || 'Não foi possível cadastrar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }
}

// insere o item recém-cadastrado mantendo a lista em ordem alfabética (como vem da API)
export function incluirOrdenado<T extends { nome: string }>(lista: T[], item: T): T[] {
  return [...lista, item].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
