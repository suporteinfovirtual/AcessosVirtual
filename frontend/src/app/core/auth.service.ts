import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  login(senha: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/login', { senha });
  }
}
