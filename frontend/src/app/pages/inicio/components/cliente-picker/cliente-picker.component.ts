import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteRef, SISTEMAS } from '../../../../core/models';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ClientesService } from '../../../../core/clientes.service';

@Component({
  selector: 'app-cliente-picker',
  imports: [FormsModule],
  templateUrl: './cliente-picker.component.html',
})
export class ClientePickerComponent implements OnInit {
  private clientesSistemasService = inject(ClientesSistemasService);
  private clientesService = inject(ClientesService);

  selecionado = input<ClienteRef | null>(null);
  selecionadoChange = output<ClienteRef | null>();

  busca = signal('');
  sugestoesAbertas = signal(false);
  carregando = signal(true);

  todosClientes = signal<ClienteRef[]>([]);

  sugestoes = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return [];
    return this.todosClientes()
      .filter((c) => c.nome.toLowerCase().includes(termo))
      .slice(0, 20);
  });

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const [uniplus, sgbr, geral] = await Promise.all([
        firstValueFrom(this.clientesSistemasService.listar('uniplus')),
        firstValueFrom(this.clientesSistemasService.listar('sgbr')),
        firstValueFrom(this.clientesService.listar()),
      ]);

      const lista: ClienteRef[] = [];
      for (const c of uniplus) lista.push({ sistema: 'uniplus', ref_id: c.id!, nome: c.nome, cnpj: c.cnpj });
      for (const c of sgbr) lista.push({ sistema: 'sgbr', ref_id: c.id!, nome: c.nome, cnpj: c.cnpj });
      for (const c of geral) {
        if (c.acessos?.some((a) => a.tipo === 'acesso_web')) {
          lista.push({ sistema: 'uniplus_web', ref_id: c.id!, nome: c.nome, cnpj: c.cnpj });
        }
        if (c.acessos?.some((a) => a.tipo === 'acesso_zeta')) {
          lista.push({ sistema: 'zeta', ref_id: c.id!, nome: c.nome, cnpj: c.cnpj });
        }
      }
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
      this.todosClientes.set(lista);
    } finally {
      this.carregando.set(false);
    }
  }

  rotuloSistema(sistema: string): string {
    return SISTEMAS.find((s) => s.valor === sistema)?.rotulo || sistema;
  }

  selecionar(cliente: ClienteRef) {
    this.selecionadoChange.emit(cliente);
    this.busca.set('');
    this.sugestoesAbertas.set(false);
  }

  limpar() {
    this.selecionadoChange.emit(null);
  }

  fecharComAtraso() {
    setTimeout(() => this.sugestoesAbertas.set(false), 150);
  }
}
