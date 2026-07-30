import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from './models';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private http = inject(HttpClient);

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>('/api/categorias');
  }

  criar(categoria: Categoria): Observable<{ id: number; nome: string }> {
    return this.http.post<{ id: number; nome: string }>('/api/categorias', categoria);
  }

  atualizar(id: number, categoria: Partial<Categoria>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/categorias/${id}`, categoria);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/categorias/${id}`);
  }
}
