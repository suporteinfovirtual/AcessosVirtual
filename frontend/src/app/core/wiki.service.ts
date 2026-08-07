import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WikiArtigo } from './models';

export interface DadosArtigo {
  titulo: string;
  codigo?: string | null;
  mensagem_erro?: string | null;
  causa?: string | null;
  solucao?: string | null;
}

@Injectable({ providedIn: 'root' })
export class WikiService {
  private http = inject(HttpClient);

  listar(): Observable<WikiArtigo[]> {
    return this.http.get<WikiArtigo[]>('/api/wiki');
  }

  obter(id: number): Observable<WikiArtigo> {
    return this.http.get<WikiArtigo>(`/api/wiki/${id}`);
  }

  criar(artigo: DadosArtigo): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/wiki', artigo);
  }

  atualizar(id: number, artigo: DadosArtigo): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/wiki/${id}`, artigo);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/wiki/${id}`);
  }

  adicionarImagem(artigoId: number, imagem: File): Observable<{ id: number }> {
    const form = new FormData();
    form.append('imagem', imagem, imagem.name);
    return this.http.post<{ id: number }>(`/api/wiki/${artigoId}/imagens`, form);
  }

  removerImagem(imagemId: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/wiki/imagens/${imagemId}`);
  }
}
