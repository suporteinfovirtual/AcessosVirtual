import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, Categoria, Cliente, TIPOS_ACESSO, TipoAcesso } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { CategoriasService } from '../../../../core/categorias.service';

interface CampoAcesso {
  ativo: boolean;
  id?: number;
  identificador: string;
  usuario: string;
  senha: string;
  link: string;
  servidor: string;
  contabilidade: string;
  observacoes: string;
}

@Component({
  selector: 'app-cliente-modal',
  imports: [FormsModule],
  templateUrl: './cliente-modal.component.html',
})
export class ClienteModalComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);

  cliente = input<Cliente | null>(null);
  tipoInicial = input<TipoAcesso | null>(null);
  fechar = output<void>();
  salvo = output<void>();

  readonly tipos = TIPOS_ACESSO;

  nome = signal('');
  cnpj = signal('');
  observacoes = signal('');
  categoriaId = signal<number | null>(null);
  categorias = signal<Categoria[]>([]);

  acessosPorTipo: Record<TipoAcesso, CampoAcesso> = this.acessosVazios();

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  get editando() {
    return !!this.cliente()?.id;
  }

  // só mostra o tipo de acesso da aba em que o usuário estava, tanto ao cadastrar quanto ao editar
  get tiposExibidos() {
    const tipo = this.tipoInicial();
    return tipo ? this.tipos.filter((t) => t.valor === tipo) : this.tipos;
  }

  ngOnInit() {
    firstValueFrom(this.categoriasService.listar()).then((categorias) => this.categorias.set(categorias));

    const cliente = this.cliente();
    if (cliente) {
      this.nome.set(cliente.nome);
      this.cnpj.set(cliente.cnpj || '');
      this.observacoes.set(cliente.observacoes || '');
      this.categoriaId.set(cliente.categoria_id || null);

      for (const acesso of cliente.acessos || []) {
        this.acessosPorTipo[acesso.tipo] = {
          ativo: true,
          id: acesso.id,
          identificador: acesso.identificador || '',
          usuario: acesso.usuario || '',
          senha: acesso.senha || '',
          link: acesso.link || '',
          servidor: acesso.servidor || '',
          contabilidade: acesso.contabilidade || '',
          observacoes: acesso.observacoes || '',
        };
      }
    } else if (this.tipoInicial()) {
      this.acessosPorTipo[this.tipoInicial()!].ativo = true;
    }
  }

  private acessosVazios(): Record<TipoAcesso, CampoAcesso> {
    return {
      anydesk: { ativo: false, identificador: '', usuario: '', senha: '', link: '', servidor: '', contabilidade: '', observacoes: '' },
      acesso_web: { ativo: false, identificador: '', usuario: '', senha: '', link: '', servidor: '', contabilidade: '', observacoes: '' },
      acesso_zeta: { ativo: false, identificador: '', usuario: '', senha: '', link: '', servidor: '', contabilidade: '', observacoes: '' },
    };
  }

  async salvarCliente() {
    if (!this.nome().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dadosCliente = {
      nome: this.nome().trim(),
      cnpj: this.cnpj().trim() || null,
      observacoes: this.observacoes().trim() || null,
      categoria_id: this.categoriaId(),
    };

    try {
      if (this.editando) {
        const clienteId = this.cliente()!.id!;
        await firstValueFrom(this.clientesService.atualizar(clienteId, dadosCliente));
        await this.sincronizarAcessos(clienteId);
      } else {
        const acessosNovos = this.montarAcessosAtivos();
        await firstValueFrom(this.clientesService.criar({ ...dadosCliente, acessos: acessosNovos } as Cliente));
      }
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  private montarAcessosAtivos(): Acesso[] {
    const porTipo = this.acessosPorTipo;
    return this.tipos
      .map((t) => t.valor)
      .filter((tipo) => porTipo[tipo].ativo)
      .map((tipo) => this.campoParaAcesso(tipo, porTipo[tipo]));
  }

  private campoParaAcesso(tipo: TipoAcesso, campo: CampoAcesso): Acesso {
    return {
      tipo,
      identificador: campo.identificador.trim() || null,
      usuario: campo.usuario.trim() || null,
      senha: campo.senha.trim() || null,
      link: campo.link.trim() || null,
      servidor: campo.servidor.trim() || null,
      contabilidade: campo.contabilidade.trim() || null,
      observacoes: campo.observacoes.trim() || null,
    };
  }

  private async sincronizarAcessos(clienteId: number) {
    const porTipo = this.acessosPorTipo;

    for (const { valor: tipo } of this.tipos) {
      const campo = porTipo[tipo];

      if (campo.ativo && !campo.id) {
        await firstValueFrom(this.clientesService.adicionarAcesso(clienteId, this.campoParaAcesso(tipo, campo)));
      } else if (campo.ativo && campo.id) {
        await firstValueFrom(this.clientesService.atualizarAcesso(campo.id, this.campoParaAcesso(tipo, campo)));
      } else if (!campo.ativo && campo.id) {
        await firstValueFrom(this.clientesService.removerAcesso(campo.id));
      }
    }
  }

  async excluirCliente() {
    const cliente = this.cliente();
    if (!cliente?.id || this.excluindo()) return;
    if (!confirm(`Excluir "${cliente.nome}" e todos os acessos vinculados a ele?`)) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.clientesService.remover(cliente.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível excluir. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}
