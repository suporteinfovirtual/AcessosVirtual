import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  senha = signal('');
  carregando = signal(false);
  erro = signal('');

  entrar() {
    if (!this.senha() || this.carregando()) return;

    this.carregando.set(true);
    this.erro.set('');

    this.auth.login(this.senha()).subscribe({
      next: () => {
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.carregando.set(false);
        this.erro.set(err.status === 401 ? 'Senha incorreta.' : 'Não foi possível entrar. Tente novamente.');
      },
    });
  }
}
