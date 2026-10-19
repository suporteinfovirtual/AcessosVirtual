# Recebe um link acessoanydesk:<ID>?s=<senha em base64url> (gerado pelo botão "Auto" do painel),
# abre o AnyDesk conectando nesse ID e, quando ele pedir a senha, digita a senha sozinho.
#
# Não usa o "--with-password" do AnyDesk: na 9.7.13 ele dá crash ao abrir a janela de senha.
# Em vez disso acompanha o log do AnyDesk (ad.trace) até aparecer "Showing the password dialog"
# e digita na janela — só se a janela em foco for mesmo do AnyDesk.
param([string]$Url)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

function Avisar([string]$mensagem) {
  [System.Windows.Forms.MessageBox]::Show($mensagem, 'Conectar AnyDesk', 'OK', 'Warning') | Out-Null
}

function Falhar([string]$mensagem) {
  Avisar $mensagem
  exit 1
}

$m = [regex]::Match($Url, '^acessoanydesk:/*([^?/]+)/?\?s=([A-Za-z0-9_-]+)/?$')
if (-not $m.Success) { Falhar "Link inválido: $Url" }

# ID numérico ou alias (fulano@ad); nada além disso entra na linha de comando
$id = [Uri]::UnescapeDataString($m.Groups[1].Value) -replace '\s', ''
if ($id -notmatch '^[A-Za-z0-9._-]+(@[A-Za-z0-9._-]+)?$') { Falhar "ID do AnyDesk inválido: $id" }

$b64 = $m.Groups[2].Value.Replace('-', '+').Replace('_', '/')
$b64 = $b64.PadRight($b64.Length + (4 - $b64.Length % 4) % 4, '=')
try {
  $senha = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
} catch {
  Falhar 'Não foi possível ler a senha do link.'
}

# usa o mesmo executável que o protocolo anydesk: já registrado aponta
$exe = $null
try {
  $comando = (Get-ItemProperty 'Registry::HKEY_CLASSES_ROOT\anydesk\shell\open\command').'(default)'
  if ($comando -match '^"([^"]+)"') { $exe = $Matches[1] }
} catch {}
if (-not $exe -or -not (Test-Path $exe)) {
  $exe = @(
    "${env:ProgramFiles(x86)}\AnyDesk\AnyDesk.exe",
    "$env:ProgramFiles\AnyDesk\AnyDesk.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $exe) { Falhar 'AnyDesk não encontrado neste computador.' }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class JanelaEmFoco {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr janela, out uint pid);
  public static uint Pid() { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return pid; }
}
'@

# guarda onde o log está agora, pra só olhar o que o AnyDesk escrever depois de abrir a conexão
$trace = Join-Path $env:APPDATA 'AnyDesk\ad.trace'
$posicao = if (Test-Path $trace) { (Get-Item $trace).Length } else { 0 }

Start-Process -FilePath $exe -ArgumentList $id

function LerNovasLinhas {
  if (-not (Test-Path $trace)) { return @() }
  $arquivo = [IO.File]::Open($trace, 'Open', 'Read', 'ReadWrite, Delete')
  try {
    if ($arquivo.Length -lt $script:posicao) { $script:posicao = 0 } # o AnyDesk rotacionou o log
    $arquivo.Position = $script:posicao
    $texto = (New-Object IO.StreamReader($arquivo)).ReadToEnd()
    $script:posicao = $arquivo.Length
    return $texto -split "`r?`n"
  } finally {
    $arquivo.Dispose()
  }
}

# espera o AnyDesk pedir a senha (ou conectar sem pedir, ou desistir)
$pidAnydesk = $null
$limite = (Get-Date).AddSeconds(60)
while (-not $pidAnydesk -and (Get-Date) -lt $limite) {
  Start-Sleep -Milliseconds 300
  foreach ($linha in LerNovasLinhas) {
    if ($linha -match 'front\s+(\d+)\s+\d+\s+gui\.display_panel - Showing the password dialog') {
      $pidAnydesk = [uint32]$Matches[1]
      break
    }
    if ($linha -match 'front\s+\d+.*(Session started|A fatal application error)') { exit 0 }
  }
}
if (-not $pidAnydesk) { exit 0 }

# dá tempo da janela de senha aparecer e pegar o foco
Start-Sleep -Milliseconds 600
if ([JanelaEmFoco]::Pid() -ne $pidAnydesk) {
  (New-Object -ComObject WScript.Shell).AppActivate([int]$pidAnydesk) | Out-Null
  Start-Sleep -Milliseconds 400
}

# nunca digita a senha numa janela que não seja do AnyDesk
if ([JanelaEmFoco]::Pid() -ne $pidAnydesk) {
  Set-Clipboard -Value $senha
  Falhar 'Não consegui digitar a senha na janela do AnyDesk. Ela foi copiada — cole lá.'
}

# caracteres especiais do SendKeys precisam ir entre chaves
$teclas = $senha -replace '([+^%~(){}\[\]])', '{$1}'
[System.Windows.Forms.SendKeys]::SendWait($teclas)
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
