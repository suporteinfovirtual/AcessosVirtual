import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Instalacao, StatusInstalacao } from './models';

@Injectable({ providedIn: 'root' })
export class InstalacoesService {
  private http = inject(HttpClient);

  listar(status?: StatusInstalacao, pendenteAgendamento?: boolean): Observable<Instalacao[]> {
    const params: Record<string, string> = {
      ...(status ? { status } : {}),
      ...(pendenteAgendamento ? { pendente_agendamento: '1' } : {}),
    };
    return this.http.get<Instalacao[]>('/api/instalacoes', { params });
  }

  criar(instalacao: Partial<Instalacao>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/instalacoes', instalacao);
  }

  atualizar(id: number, instalacao: Partial<Instalacao>): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>(`/api/instalacoes/${id}`, instalacao);
  }

  remover(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`/api/instalacoes/${id}`);
  }
}
