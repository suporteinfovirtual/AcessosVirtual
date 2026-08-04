import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Licenca } from './models';

@Injectable({ providedIn: 'root' })
export class LicencasService {
  private http = inject(HttpClient);

  listar(): Observable<Licenca[]> {
    return this.http.get<Licenca[]>('/api/licencas');
  }

  criar(licenca: Licenca): Observable<{ id: number; nome: string }> {
    return this.http.post<{ id: number; nome: string }>('/api/licencas', licenca);
  }

  atualizar(id: number, licenca: Partial<Licenca>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/licencas/${id}`, licenca);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/licencas/${id}`);
  }
}
