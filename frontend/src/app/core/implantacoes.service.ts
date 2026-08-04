import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Implantacao } from './models';

@Injectable({ providedIn: 'root' })
export class ImplantacoesService {
  private http = inject(HttpClient);

  listar(): Observable<Implantacao[]> {
    return this.http.get<Implantacao[]>('/api/implantacoes');
  }

  criar(implantacao: Implantacao): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/implantacoes', implantacao);
  }

  atualizar(id: number, implantacao: Partial<Implantacao>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/implantacoes/${id}`, implantacao);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/implantacoes/${id}`);
  }
}
