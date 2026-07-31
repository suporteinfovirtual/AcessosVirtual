import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Manual } from './models';

interface DadosPasso {
  ordem: number;
  texto: string;
  arquivo?: File | null;
  removerArquivo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ManuaisService {
  private http = inject(HttpClient);

  listar(): Observable<Manual[]> {
    return this.http.get<Manual[]>('/api/manuais');
  }

  obter(id: number): Observable<Manual> {
    return this.http.get<Manual>(`/api/manuais/${id}`);
  }

  criar(manual: { titulo: string; descricao?: string | null }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/manuais', manual);
  }

  atualizar(id: number, manual: { titulo: string; descricao?: string | null }): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/manuais/${id}`, manual);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/manuais/${id}`);
  }

  adicionarPasso(manualId: number, dados: DadosPasso): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`/api/manuais/${manualId}/passos`, this.formPasso(dados));
  }

  atualizarPasso(passoId: number, dados: DadosPasso): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/passos/${passoId}`, this.formPasso(dados));
  }

  removerPasso(passoId: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/passos/${passoId}`);
  }

  baixarArquivoPasso(passoId: number): Observable<Blob> {
    return this.http.get(`/api/passos/${passoId}/arquivo`, { responseType: 'blob' });
  }

  adicionarImagemPasso(passoId: number, imagem: File): Observable<{ id: number }> {
    const form = new FormData();
    form.append('imagem', imagem, imagem.name);
    return this.http.post<{ id: number }>(`/api/passos/${passoId}/imagens`, form);
  }

  removerImagemPasso(imagemId: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/imagens/${imagemId}`);
  }

  private formPasso(dados: DadosPasso): FormData {
    const form = new FormData();
    form.append('ordem', String(dados.ordem));
    form.append('texto', dados.texto || '');
    if (dados.arquivo) form.append('arquivo', dados.arquivo, dados.arquivo.name);
    if (dados.removerArquivo) form.append('remover_arquivo', '1');
    return form;
  }
}
