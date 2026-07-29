import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContaInterna } from './models';

@Injectable({ providedIn: 'root' })
export class InternosService {
  private http = inject(HttpClient);

  listar(): Observable<ContaInterna[]> {
    return this.http.get<ContaInterna[]>('/api/internos');
  }

  criar(conta: ContaInterna): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/internos', conta);
  }

  atualizar(id: number, conta: Partial<ContaInterna>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/internos/${id}`, conta);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/internos/${id}`);
  }
}
