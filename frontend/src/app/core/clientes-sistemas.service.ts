import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteSistema, Sistema } from './models';

@Injectable({ providedIn: 'root' })
export class ClientesSistemasService {
  private http = inject(HttpClient);

  listar(sistema: Sistema, busca?: string): Observable<ClienteSistema[]> {
    const params: Record<string, string> = { sistema, ...(busca ? { busca } : {}) };
    return this.http.get<ClienteSistema[]>('/api/clientes-sistemas', { params });
  }

  criar(cliente: ClienteSistema): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/clientes-sistemas', cliente);
  }

  atualizar(id: number, cliente: Partial<ClienteSistema>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/clientes-sistemas/${id}`, cliente);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/clientes-sistemas/${id}`);
  }
}
