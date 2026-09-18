import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { Acesso, CertificadoDigital, Contabilidade, Instalacao, SISTEMAS, Sistema, Tecnico } from '../../../../core/models';
import { InstalacoesService } from '../../../../core/instalacoes.service';
import { TecnicosService } from '../../../../core/tecnicos.service';
import { ClientesService } from '../../../../core/clientes.service';
import { ClientesSistemasService } from '../../../../core/clientes-sistemas.service';
import { ContabilidadesService } from '../../../../core/contabilidades.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { formatarTelefone, somenteDigitos } from '../../../../core/texto.util';
import { lerValidadeCertificado, paraDataIso, statusCertificado as calcularStatusCertificado } from '../../../../core/certificado.util';

// sistemas unificados com os Acessos: o acesso ao sistema é cadastrado aqui na Instalação
const TIPO_POR_SISTEMA_UNIFICADO: Partial<Record<Sistema, 'acesso_web' | 'acesso_zeta'>> = {
  uniplus_web: 'acesso_web',
  zeta: 'acesso_zeta',
};

const LINK_PADRAO: Record<'acesso_web' | 'acesso_zeta', string> = {
  acesso_web: 'https://canal.intelidata.inf.br/acesso/',
  acesso_zeta: 'https://zweb.com.br/#/sign-in',
};

@Component({
  selector: 'app-instalacao-modal',
  imports: [FormsModule, DatePipe],
  templateUrl: './instalacao-modal.component.html',
})
export class InstalacaoModalComponent implements OnInit {
  private instalacoesService = inject(InstalacoesService);
  private tecnicosService = inject(TecnicosService);
  private clientesService = inject(ClientesService);
  private clientesSistemasService = inject(ClientesSistemasService);
  private contabilidadesService = inject(ContabilidadesService);
  private confirmService = inject(ConfirmService);
  private http = inject(HttpClient);

  instalacao = input.required<Instalacao>();
  fechar = output<void>();
  salvo = output<void>();

  telefone = signal('');
  email = signal('');
  tecnicoId = signal<number | null>(null);
  dataInstalacao = signal('');
  observacoes = signal('');
  instalado = signal(false);
  tecnicos = signal<Tecnico[]>([]);

  // --- acesso ao sistema (Acesso Zeta / Acesso Web): o técnico cadastra o cliente no sistema
  // e registra o acesso aqui; no Zeta o login é o próprio e-mail do cliente ---
  tipoAcesso = computed(() => TIPO_POR_SISTEMA_UNIFICADO[this.instalacao().cliente_sistema] ?? null);
  rotuloAcesso = computed(() => (this.tipoAcesso() === 'acesso_zeta' ? 'Acesso Zeta' : 'Acesso Web'));
  acessoOriginal = signal<Acesso | null>(null);
  acessoAberto = signal(false);
  acessoSenha = signal('');
  acessoLink = signal('');
  acessoServidor = signal('');
  acessoContabilidadeId = signal<number | null>(null);
  acessoEnviarContabilidade = signal(false);
  contabilidades = signal<Contabilidade[]>([]);

  emailContabilidade = computed(() => this.contabilidades().find((c) => c.id === this.acessoContabilidadeId())?.email || '');

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  // --- certificado digital: zeta/uniplus_web vivem na tabela clientes (cliente_ref_id =
  // clientes.id, endpoints /api/clientes/:id/certificado); uniplus/sgbr vivem em
  // clientes_sistemas (endpoints /api/clientes-sistemas/:id/certificado) ---
  certificado = signal<CertificadoDigital | null>(null);
  formCertificadoAberto = signal(false);
  arquivoCertificado = signal<File | null>(null);
  senhaCertificado = signal('');
  enviandoCertificado = signal(false);
  erroCertificado = signal('');

  private ehSistemaUnificado(): boolean {
    const sistema = this.instalacao().cliente_sistema;
    return sistema === 'zeta' || sistema === 'uniplus_web';
  }

  rotuloSistema = computed(() => SISTEMAS.find((s) => s.valor === this.instalacao().cliente_sistema)?.rotulo ?? '');

  linkWhatsapp = computed(() => {
    const digitos = somenteDigitos(this.telefone());
    if (digitos.length < 10) return null;
    return `https://wa.me/55${digitos}`;
  });

  aoDigitarTelefone(valor: string) {
    this.telefone.set(formatarTelefone(valor));
  }

  ngOnInit() {
    firstValueFrom(this.tecnicosService.listar()).then((tecnicos) => this.tecnicos.set(tecnicos));

    const item = this.instalacao();
    this.telefone.set(item.telefone || '');
    this.email.set(item.email || '');
    this.tecnicoId.set(item.tecnico_id || null);
    this.dataInstalacao.set(item.data_instalacao || '');
    this.observacoes.set(item.observacoes || '');
    this.instalado.set(!!item.instalado);

    if (this.ehSistemaUnificado()) {
      firstValueFrom(this.contabilidadesService.listar()).then((lista) => this.contabilidades.set(lista));
      firstValueFrom(this.clientesService.obter(item.cliente_ref_id))
        .then((cliente) => {
          this.certificado.set(cliente.certificado || null);
          const acesso = cliente.acessos?.find((a) => a.tipo === this.tipoAcesso());
          if (acesso) this.preencherAcesso(acesso);
        })
        .catch(() => {});
    } else {
      firstValueFrom(this.clientesSistemasService.obter(item.cliente_ref_id))
        .then((cliente) => this.certificado.set(cliente.certificado || null))
        .catch(() => {});
    }
  }

  private preencherAcesso(acesso: Acesso) {
    this.acessoOriginal.set(acesso);
    this.acessoAberto.set(true);
    this.acessoSenha.set(acesso.senha || '');
    this.acessoLink.set(acesso.link || '');
    this.acessoServidor.set(acesso.servidor || '');
    this.acessoContabilidadeId.set(acesso.contabilidade_id || null);
    this.acessoEnviarContabilidade.set(!!acesso.enviar_contabilidade);
    // no Zeta o e-mail é o login; se o acesso já tem um, ele é o que vale
    if (this.tipoAcesso() === 'acesso_zeta' && acesso.identificador) this.email.set(acesso.identificador);
  }

  async abrirAcesso() {
    const tipo = this.tipoAcesso();
    if (!tipo) return;
    this.acessoLink.set(LINK_PADRAO[tipo]);
    this.acessoAberto.set(true);
    // o Zeta cria o cliente com uma senha padrão: vem preenchida, mas continua editável
    if (tipo === 'acesso_zeta' && !this.acessoSenha()) {
      try {
        const padroes = await firstValueFrom(this.http.get<{ senha_padrao_zeta: string | null }>('/api/padroes'));
        if (padroes.senha_padrao_zeta && !this.acessoSenha()) this.acessoSenha.set(padroes.senha_padrao_zeta);
      } catch {
        // sem padrão: o técnico digita a senha
      }
    }
  }

  cancelarAcesso() {
    this.acessoAberto.set(false);
  }

  private async salvarAcesso() {
    const tipo = this.tipoAcesso();
    if (!tipo || !this.acessoAberto()) return;

    const original = this.acessoOriginal();
    const acesso: Acesso = {
      ...original,
      tipo,
      identificador: tipo === 'acesso_zeta' ? this.email().trim() || null : original?.identificador ?? null,
      senha: this.acessoSenha().trim() || null,
      link: this.acessoLink().trim() || null,
      servidor: this.acessoServidor().trim() || null,
      contabilidade_id: this.acessoContabilidadeId(),
      enviar_contabilidade: this.acessoEnviarContabilidade(),
    };

    if (original?.id) {
      await firstValueFrom(this.clientesService.atualizarAcesso(original.id, acesso));
    } else {
      const { id } = await firstValueFrom(this.clientesService.adicionarAcesso(this.instalacao().cliente_ref_id, acesso));
      this.acessoOriginal.set({ ...acesso, id });
    }
  }

  async salvar() {
    if (this.salvando()) return;

    if (this.instalado() && !this.instalacao().instalado && this.tipoAcesso() && !this.acessoAberto()) {
      const seguir = await this.confirmService.confirmar(
        `O ${this.rotuloAcesso()} ainda não foi cadastrado. Marcar como instalado mesmo assim?`
      );
      if (!seguir) return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      telefone: this.telefone().trim() || null,
      email: this.email().trim() || null,
      tecnico_id: this.tecnicoId(),
      data_instalacao: this.dataInstalacao() || null,
      observacoes: this.observacoes().trim() || null,
      instalado: this.instalado(),
    };

    try {
      await this.salvarAcesso();
      await firstValueFrom(this.instalacoesService.atualizar(this.instalacao().id!, dados));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.salvando.set(false);
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

  aoSelecionarArquivoCertificado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivoCertificado.set(input.files?.[0] || null);
  }

  statusCertificado(): 'vencido' | 'alerta' | null {
    return calcularStatusCertificado(this.certificado()?.validade);
  }

  async baixarCertificado() {
    const nome = this.certificado()?.nome_arquivo || 'certificado.pfx';
    this.erroCertificado.set('');
    try {
      const clienteId = this.instalacao().cliente_ref_id;
      const blob = await firstValueFrom(
        this.ehSistemaUnificado() ? this.clientesService.baixarCertificado(clienteId) : this.clientesSistemasService.baixarCertificado(clienteId)
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.erroCertificado.set('Não foi possível baixar o certificado.');
    }
  }

  async enviarCertificado() {
    const arquivo = this.arquivoCertificado();
    const senha = this.senhaCertificado();
    if (!arquivo || !senha || this.enviandoCertificado()) return;

    this.enviandoCertificado.set(true);
    this.erroCertificado.set('');
    try {
      const validadeIso = paraDataIso(await lerValidadeCertificado(arquivo, senha));
      const clienteId = this.instalacao().cliente_ref_id;
      const envio = this.ehSistemaUnificado()
        ? this.clientesService.enviarCertificado(clienteId, arquivo, senha, validadeIso)
        : this.clientesSistemasService.enviarCertificado(clienteId, arquivo, senha, validadeIso);
      await firstValueFrom(envio);
      this.certificado.set({ nome_arquivo: arquivo.name, senha, validade: validadeIso });
      this.formCertificadoAberto.set(false);
    } catch (e) {
      this.erroCertificado.set(e instanceof Error ? e.message : 'Não foi possível enviar o certificado.');
    } finally {
      this.enviandoCertificado.set(false);
    }
  }

  async excluir() {
    const item = this.instalacao();
    if (!item.id || this.excluindo()) return;

    const mensagem = item.negociacao_id
      ? `Remover a instalação de "${item.cliente_nome}"? O cliente volta para a Negociação.`
      : `Remover a instalação de "${item.cliente_nome}"?`;
    if (!(await this.confirmService.confirmar(mensagem))) return;

    this.excluindo.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.instalacoesService.remover(item.id));
      this.salvo.emit();
    } catch {
      this.erro.set('Não foi possível remover. Tente novamente.');
    } finally {
      this.excluindo.set(false);
    }
  }
}
