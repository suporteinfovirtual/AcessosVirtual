import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LinkPessoal } from '../../core/models';
import { LinksService } from '../../core/links.service';
import { LinkModalComponent } from './components/link-modal/link-modal.component';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, LinkModalComponent],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  private linksService = inject(LinksService);

  links = signal<LinkPessoal[]>([]);
  carregando = signal(true);

  modalAberto = signal(false);
  linkEmEdicao = signal<LinkPessoal | null>(null);

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const links = await firstValueFrom(this.linksService.listar());
      this.links.set(links);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirNovo() {
    this.linkEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(link: LinkPessoal) {
    this.linkEmEdicao.set(link);
    this.modalAberto.set(true);
  }

  fecharModal() {
    this.modalAberto.set(false);
    this.linkEmEdicao.set(null);
  }

  async aoSalvar() {
    this.fecharModal();
    await this.carregar();
  }
}
