import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LinkPessoal } from './models';

@Injectable({ providedIn: 'root' })
export class LinksService {
  private http = inject(HttpClient);

  listar(): Observable<LinkPessoal[]> {
    return this.http.get<LinkPessoal[]>('/api/links');
  }

  criar(link: LinkPessoal): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/links', link);
  }

  atualizar(id: number, link: Partial<LinkPessoal>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/links/${id}`, link);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/links/${id}`);
  }
}
