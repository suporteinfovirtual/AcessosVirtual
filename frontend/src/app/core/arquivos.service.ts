import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Arquivo } from './models';

@Injectable({ providedIn: 'root' })
export class ArquivosService {
  private http = inject(HttpClient);

  listar(): Observable<Arquivo[]> {
    return this.http.get<Arquivo[]>('/api/arquivos');
  }

  enviar(arquivo: File, titulo?: string | null): Observable<{ id: number }> {
    const form = new FormData();
    form.append('arquivo', arquivo, arquivo.name);
    if (titulo) form.append('titulo', titulo);
    return this.http.post<{ id: number }>('/api/arquivos', form);
  }

  substituir(id: number, arquivo: File): Observable<{ ok: true }> {
    const form = new FormData();
    form.append('arquivo', arquivo, arquivo.name);
    return this.http.put<{ ok: true }>(`/api/arquivos/${id}`, form);
  }

  renomear(id: number, titulo: string | null): Observable<{ ok: true }> {
    return this.http.patch<{ ok: true }>(`/api/arquivos/${id}`, { titulo });
  }

  baixar(id: number): Observable<Blob> {
    return this.http.get(`/api/arquivos/${id}`, { responseType: 'blob' });
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/arquivos/${id}`);
  }
}
