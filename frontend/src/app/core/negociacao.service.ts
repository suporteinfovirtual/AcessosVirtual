import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteNegociacao } from './models';

@Injectable({ providedIn: 'root' })
export class NegociacaoService {
  private http = inject(HttpClient);

  listar(busca?: string): Observable<ClienteNegociacao[]> {
    const params: Record<string, string> = busca ? { busca } : {};
    return this.http.get<ClienteNegociacao[]>('/api/negociacao', { params });
  }

  criar(cliente: ClienteNegociacao): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/negociacao', cliente);
  }

  atualizar(id: number, cliente: Partial<ClienteNegociacao>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/negociacao/${id}`, cliente);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/negociacao/${id}`);
  }
}
