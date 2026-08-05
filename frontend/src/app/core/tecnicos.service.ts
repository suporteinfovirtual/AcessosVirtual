import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tecnico } from './models';

@Injectable({ providedIn: 'root' })
export class TecnicosService {
  private http = inject(HttpClient);

  listar(): Observable<Tecnico[]> {
    return this.http.get<Tecnico[]>('/api/tecnicos');
  }

  criar(tecnico: Tecnico): Observable<{ id: number; nome: string }> {
    return this.http.post<{ id: number; nome: string }>('/api/tecnicos', tecnico);
  }

  atualizar(id: number, tecnico: Partial<Tecnico>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/tecnicos/${id}`, tecnico);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/tecnicos/${id}`);
  }
}
