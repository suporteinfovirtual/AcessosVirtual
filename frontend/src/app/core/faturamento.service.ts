import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteFaturado, ClientePendenteFaturamento, Sistema } from './models';

@Injectable({ providedIn: 'root' })
export class FaturamentoService {
  private http = inject(HttpClient);

  listarPendentes(): Observable<ClientePendenteFaturamento[]> {
    return this.http.get<ClientePendenteFaturamento[]>('/api/faturamento', { params: { filtro: 'pendentes' } });
  }

  listarFaturados(): Observable<ClienteFaturado[]> {
    return this.http.get<ClienteFaturado[]>('/api/faturamento', { params: { filtro: 'faturados' } });
  }

  marcarFaturado(cliente: { cliente_sistema: Sistema; cliente_ref_id: number; cliente_nome: string }): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/faturamento', cliente);
  }

  desmarcarFaturado(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/faturamento/${id}`);
  }
}
