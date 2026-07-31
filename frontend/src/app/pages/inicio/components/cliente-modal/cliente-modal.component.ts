import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Acesso, CertificadoDigital, Categoria, Cliente, Contabilidade, TIPOS_ACESSO, TipoAcesso } from '../../../../core/models';
import { ClientesService } from '../../../../core/clientes.service';
import { CategoriasService } from '../../../../core/categorias.service';
import { ContabilidadesService } from '../../../../core/contabilidades.service';
import { lerValidadeCertificado, paraDataIso } from '../../../../core/certificado.util';

interface CampoAcesso {
  ativo: boolean;
  id?: number;
  identificador: string;
  usuario: string;
  senha: string;
  link: string;
  servidor: string;
  contabilidadeId: number | null;
  observacoes: string;
}

@Component({
  selector: 'app-cliente-modal',
  imports: [FormsModule, DatePipe],
  templateUrl: './cliente-modal.component.html',
})
export class ClienteModalComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private categoriasService = inject(CategoriasService);
  private contabilidadesService = inject(ContabilidadesService);

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
  contabilidades = signal<Contabilidade[]>([]);

  acessosPorTipo: Record<TipoAcesso, CampoAcesso> = this.acessosVazios();

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  // --- certificado digital ---
  certificado = signal<CertificadoDigital | null>(null);
  formCertificadoAberto = signal(false);
  arquivoCertificado = signal<File | null>(null);
  senhaCertificado = signal('');
  enviandoCertificado = signal(false);
  erroCertificado = signal('');

  get editando() {
    return !!this.cliente()?.id;
  }

  // só mostra o tipo de acesso da aba em que o usuário estava, tanto ao cadastrar quanto ao editar
  get tiposExibidos() {
    const tipo = this.tipoInicial();
    return tipo ? this.tipos.filter((t) => t.valor === tipo) : this.tipos;
  }

  emailContabilidade(tipo: TipoAcesso): string | null {
    const id = this.acessosPorTipo[tipo].contabilidadeId;
    return this.contabilidades().find((c) => c.id === id)?.email || null;
  }

  ngOnInit() {
    firstValueFrom(this.categoriasService.listar()).then((categorias) => this.categorias.set(categorias));
    firstValueFrom(this.contabilidadesService.listar()).then((contabilidades) => this.contabilidades.set(contabilidades));

    const cliente = this.cliente();
    if (cliente) {
      this.nome.set(cliente.nome);
      this.cnpj.set(cliente.cnpj || '');
      this.observacoes.set(cliente.observacoes || '');
      this.categoriaId.set(cliente.categoria_id || null);
      this.certificado.set(cliente.certificado || null);

      for (const acesso of cliente.acessos || []) {
        this.acessosPorTipo[acesso.tipo] = {
          ativo: true,
          id: acesso.id,
          identificador: acesso.identificador || '',
          usuario: acesso.usuario || '',
          senha: acesso.senha || '',
          link: acesso.link || '',
          servidor: acesso.servidor || '',
          contabilidadeId: acesso.contabilidade_id || null,
          observacoes: acesso.observacoes || '',
        };
      }
    } else if (this.tipoInicial()) {
      const tipo = this.tipoInicial()!;
      this.acessosPorTipo[tipo].ativo = true;
      if (tipo === 'acesso_web') {
        this.acessosPorTipo[tipo].link = 'https://canal.intelidata.inf.br/acesso/';
      }
      if (tipo === 'acesso_zeta') {
        this.acessosPorTipo[tipo].link = 'https://zweb.com.br/#/sign-in';
      }
    }
  }

  private acessosVazios(): Record<TipoAcesso, CampoAcesso> {
    const vazio = () => ({
      ativo: false,
      identificador: '',
      usuario: '',
      senha: '',
      link: '',
      servidor: '',
      contabilidadeId: null,
      observacoes: '',
    });
    return { anydesk: vazio(), acesso_web: vazio(), acesso_zeta: vazio() };
  }

  async salvarCliente() {
    if (!this.nome().trim() || this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');
    this.erroCertificado.set('');

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
        // valida o certificado antes de criar o cliente, pra não deixar ele criado sem certificado se a senha estiver errada
        const arquivo = this.arquivoCertificado();
        const senha = this.senhaCertificado();
        let validadeCertificado: string | null = null;
        if (arquivo && senha) {
          try {
            validadeCertificado = paraDataIso(await lerValidadeCertificado(arquivo, senha));
          } catch (e) {
            this.erroCertificado.set(e instanceof Error ? e.message : 'Não foi possível ler o certificado.');
            return;
          }
        }

        const acessosNovos = this.montarAcessosAtivos();
        const resultado = await firstValueFrom(
          this.clientesService.criar({ ...dadosCliente, acessos: acessosNovos } as Cliente)
        );

        if (arquivo && senha && validadeCertificado) {
          await firstValueFrom(this.clientesService.enviarCertificado(resultado.id, arquivo, senha, validadeCertificado));
        }
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
      contabilidade_id: campo.contabilidadeId,
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

  // --- certificado digital ---

  abrirFormCertificado() {
    this.arquivoCertificado.set(null);
    this.senhaCertificado.set('');
    this.erroCertificado.set('');
    this.formCertificadoAberto.set(true);
  }

  cancelarFormCertificado() {
    this.formCertificadoAberto.set(false);
  }

  async baixarCertificado() {
    const clienteId = this.cliente()?.id;
    const nomeArquivo = this.certificado()?.nome_arquivo || 'certificado.pfx';
    if (!clienteId) return;

    this.erroCertificado.set('');
    try {
      const blob = await firstValueFrom(this.clientesService.baixarCertificado(clienteId));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.erroCertificado.set('Não foi possível baixar o certificado.');
    }
  }

  aoSelecionarArquivoCertificado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivoCertificado.set(input.files?.[0] || null);
  }

  statusCertificado(): 'vencido' | 'alerta' | null {
    const validade = this.certificado()?.validade;
    if (!validade) return null;
    const dias = (new Date(validade).getTime() - Date.now()) / 86_400_000;
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'alerta';
    return null;
  }

  async enviarCertificado() {
    const arquivo = this.arquivoCertificado();
    const senha = this.senhaCertificado();
    const clienteId = this.cliente()?.id;
    if (!arquivo || !senha || !clienteId || this.enviandoCertificado()) return;

    this.enviandoCertificado.set(true);
    this.erroCertificado.set('');

    try {
      const validade = await lerValidadeCertificado(arquivo, senha);
      const validadeIso = paraDataIso(validade);
      await firstValueFrom(this.clientesService.enviarCertificado(clienteId, arquivo, senha, validadeIso));
      this.certificado.set({ nome_arquivo: arquivo.name, validade: validadeIso });
      this.formCertificadoAberto.set(false);
    } catch (e) {
      this.erroCertificado.set(e instanceof Error ? e.message : 'Não foi possível enviar o certificado.');
    } finally {
      this.enviandoCertificado.set(false);
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
