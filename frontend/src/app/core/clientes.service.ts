import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Acesso, Cliente } from './models';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);

  listar(busca?: string): Observable<Cliente[]> {
    const params: Record<string, string> = busca ? { busca } : {};
    return this.http.get<Cliente[]>('/api/clientes', { params });
  }

  obter(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`/api/clientes/${id}`);
  }

  criar(cliente: Cliente): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/clientes', cliente);
  }

  atualizar(id: number, cliente: Partial<Cliente>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/clientes/${id}`, cliente);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/clientes/${id}`);
  }

  adicionarAcesso(clienteId: number, acesso: Acesso): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`/api/clientes/${clienteId}/acessos`, acesso);
  }

  atualizarAcesso(acessoId: number, acesso: Partial<Acesso>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/acessos/${acessoId}`, acesso);
  }

  removerAcesso(acessoId: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/acessos/${acessoId}`);
  }
}
