import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CertificadoDigital, Instalacao, SISTEMAS, Tecnico } from '../../../../core/models';
import { InstalacoesService } from '../../../../core/instalacoes.service';
import { TecnicosService } from '../../../../core/tecnicos.service';
import { ClientesService } from '../../../../core/clientes.service';
import { ConfirmService } from '../../../../shared/confirm.service';
import { formatarTelefone, somenteDigitos } from '../../../../core/texto.util';
import { lerValidadeCertificado, paraDataIso, statusCertificado as calcularStatusCertificado } from '../../../../core/certificado.util';

@Component({
  selector: 'app-instalacao-modal',
  imports: [FormsModule, DatePipe],
  templateUrl: './instalacao-modal.component.html',
})
export class InstalacaoModalComponent implements OnInit {
  private instalacoesService = inject(InstalacoesService);
  private tecnicosService = inject(TecnicosService);
  private clientesService = inject(ClientesService);
  private confirmService = inject(ConfirmService);

  instalacao = input.required<Instalacao>();
  fechar = output<void>();
  salvo = output<void>();

  telefone = signal('');
  tecnicoId = signal<number | null>(null);
  dataInstalacao = signal('');
  observacoes = signal('');
  instalado = signal(false);
  tecnicos = signal<Tecnico[]>([]);

  salvando = signal(false);
  excluindo = signal(false);
  erro = signal('');

  // --- certificado digital: só p/ zeta / uniplus_web, que vivem na tabela clientes
  // (cliente_ref_id = clientes.id) e usam os endpoints /api/clientes/:id/certificado ---
  certificado = signal<CertificadoDigital | null>(null);
  formCertificadoAberto = signal(false);
  arquivoCertificado = signal<File | null>(null);
  senhaCertificado = signal('');
  enviandoCertificado = signal(false);
  erroCertificado = signal('');

  suportaCertificado = computed(
    () => this.instalacao().cliente_sistema === 'zeta' || this.instalacao().cliente_sistema === 'uniplus_web'
  );

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
    this.tecnicoId.set(item.tecnico_id || null);
    this.dataInstalacao.set(item.data_instalacao || '');
    this.observacoes.set(item.observacoes || '');
    this.instalado.set(!!item.instalado);

    if (this.suportaCertificado()) {
      firstValueFrom(this.clientesService.obter(item.cliente_ref_id))
        .then((cliente) => this.certificado.set(cliente.certificado || null))
        .catch(() => {});
    }
  }

  async salvar() {
    if (this.salvando()) return;

    this.salvando.set(true);
    this.erro.set('');

    const dados = {
      telefone: this.telefone().trim() || null,
      tecnico_id: this.tecnicoId(),
      data_instalacao: this.dataInstalacao() || null,
      observacoes: this.observacoes().trim() || null,
      instalado: this.instalado(),
    };

    try {
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
      const blob = await firstValueFrom(this.clientesService.baixarCertificado(this.instalacao().cliente_ref_id));
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
      await firstValueFrom(
        this.clientesService.enviarCertificado(this.instalacao().cliente_ref_id, arquivo, senha, validadeIso)
      );
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
    if (!(await this.confirmService.confirmar(`Remover a instalação de "${item.cliente_nome}"?`))) return;

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
