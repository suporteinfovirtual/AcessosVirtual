-- Contador global de alterações: toda escrita na API incrementa, e os navegadores
-- consultam /api/sincronizacao pra saber quando recarregar os dados.
CREATE TABLE IF NOT EXISTS sincronizacao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  versao INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sincronizacao (id, versao) VALUES (1, 0);
