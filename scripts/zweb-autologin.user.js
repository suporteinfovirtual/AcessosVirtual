// ==UserScript==
// @name         Zweb Auto-login (painel-clientes)
// @namespace    painel-clientes
// @version      1.0
// @description  Preenche e envia o login do zweb.com.br usando e-mail/senha vindos do link do painel de clientes
// @match        https://zweb.com.br/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function lerCredenciais() {
    const hash = location.hash || '';
    const idx = hash.indexOf('?');
    if (idx === -1) return null;
    const params = new URLSearchParams(hash.slice(idx + 1));
    const email = params.get('zw_e');
    const senha = params.get('zw_p');
    if (!email || !senha) return null;
    return { email, senha };
  }

  function setNativeValue(elemento, valor) {
    const descritor =
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(elemento), 'value') ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descritor.set.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
    elemento.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function encontrarCampos() {
    const email = document.querySelector(
      'input[type="email"], input[name="email"], input[formcontrolname="email"], input[autocomplete="username"]'
    );
    const senha = document.querySelector('input[type="password"]');
    return { email, senha };
  }

  function encontrarBotaoEntrar() {
    const botoes = Array.from(document.querySelectorAll('button'));
    return (
      botoes.find((b) => /entrar/i.test(b.textContent || '')) ||
      document.querySelector('button[type="submit"]')
    );
  }

  function limparUrl() {
    const semQuery = location.hash.split('?')[0];
    history.replaceState(null, '', location.pathname + location.search + semQuery);
  }

  function tentarLogin() {
    const credenciais = lerCredenciais();
    if (!credenciais) return false;

    const { email, senha } = encontrarCampos();
    if (!email || !senha) return false;

    setNativeValue(email, credenciais.email);
    setNativeValue(senha, credenciais.senha);

    const botao = encontrarBotaoEntrar();
    if (botao) {
      setTimeout(() => {
        botao.click();
        limparUrl();
      }, 150);
    }

    return true;
  }

  if (tentarLogin()) return;

  // a tela de login é uma SPA e os campos aparecem depois do carregamento inicial
  const observer = new MutationObserver(() => {
    if (tentarLogin()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => observer.disconnect(), 15000);
})();
