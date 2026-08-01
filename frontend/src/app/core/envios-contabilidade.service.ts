import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvioContabilidadeStatus } from './models';

@Injectable({ providedIn: 'root' })
export class EnviosContabilidadeService {
  private http = inject(HttpClient);

  listarStatusMes(ano: number, mes: number): Observable<EnvioContabilidadeStatus[]> {
    return this.http.get<EnvioContabilidadeStatus[]>('/api/envios-contabilidade', { params: { ano, mes } });
  }

  marcar(acessoId: number, ano: number, mes: number, enviado: boolean): Observable<{ ok: true }> {
    return this.http.put<{ ok: true }>('/api/envios-contabilidade', { acesso_id: acessoId, ano, mes, enviado });
  }
}
