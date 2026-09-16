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

  obter(id: number): Observable<ClienteSistema> {
    return this.http.get<ClienteSistema>(`/api/clientes-sistemas/${id}`);
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

  enviarCertificado(clienteId: number, arquivo: File, senha: string, validade: string | null): Observable<{ ok: true }> {
    const form = new FormData();
    form.append('arquivo', arquivo, arquivo.name);
    form.append('nome_arquivo', arquivo.name);
    form.append('senha', senha);
    if (validade) form.append('validade', validade);
    return this.http.post<{ ok: true }>(`/api/clientes-sistemas/${clienteId}/certificado`, form);
  }

  baixarCertificado(clienteId: number): Observable<Blob> {
    return this.http.get(`/api/clientes-sistemas/${clienteId}/certificado`, { responseType: 'blob' });
  }
}
