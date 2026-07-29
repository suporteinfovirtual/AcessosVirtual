import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// Garante que toda chamada à API leve o cookie de sessão e trata o 401
// redirecionando pro login (exceto a própria chamada de login).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((erro) => {
      if (erro.status === 401 && !req.url.endsWith('/api/login')) {
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    })
  );
};
