# Registra o protocolo acessoanydesk: só para o usuário atual (não precisa de administrador).
#   Instalar:  powershell -ExecutionPolicy Bypass -File instalar.ps1
#   Remover:   powershell -ExecutionPolicy Bypass -File instalar.ps1 -Remover
param([switch]$Remover)

$ErrorActionPreference = 'Stop'
$destino = Join-Path $env:LOCALAPPDATA 'AcessosVirtual\anydesk-autoconectar'
$chave = 'HKCU:\Software\Classes\acessoanydesk'

if ($Remover) {
  if (Test-Path $chave) { Remove-Item $chave -Recurse -Force }
  if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
  Write-Host 'Protocolo acessoanydesk: removido.'
  return
}

New-Item -ItemType Directory -Force $destino | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'conectar.ps1'), (Join-Path $PSScriptRoot 'conectar.vbs') $destino -Force

# -Force cria as chaves intermediárias (acessoanydesk\shell\open) se ainda não existirem
New-Item "$chave\shell\open\command" -Force | Out-Null
Set-ItemProperty $chave '(default)' 'URL:Conectar AnyDesk (painel)'
Set-ItemProperty $chave 'URL Protocol' ''
Set-ItemProperty "$chave\shell\open\command" '(default)' "wscript.exe `"$destino\conectar.vbs`" `"%1`""

Write-Host "Instalado em $destino"
Write-Host 'Na primeira vez o navegador pergunta se pode abrir o link — marque "sempre permitir".'
