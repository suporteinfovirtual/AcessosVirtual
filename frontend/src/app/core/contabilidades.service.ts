import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contabilidade } from './models';

@Injectable({ providedIn: 'root' })
export class ContabilidadesService {
  private http = inject(HttpClient);

  listar(): Observable<Contabilidade[]> {
    return this.http.get<Contabilidade[]>('/api/contabilidades');
  }

  criar(contabilidade: Contabilidade): Observable<{ id: number; nome: string; email: string | null }> {
    return this.http.post<{ id: number; nome: string; email: string | null }>('/api/contabilidades', contabilidade);
  }

  atualizar(id: number, contabilidade: Partial<Contabilidade>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/contabilidades/${id}`, contabilidade);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/contabilidades/${id}`);
  }
}
