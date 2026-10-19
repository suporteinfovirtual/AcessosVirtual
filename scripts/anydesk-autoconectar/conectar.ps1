# Recebe um link acessoanydesk:<ID>?s=<senha em base64url> (gerado pelo botão "Auto" do painel)
# e abre o AnyDesk já conectando nesse ID, mandando a senha pelo stdin (--with-password).
# Só funciona se o PC do cliente tiver senha de acesso não supervisionado configurada.
param([string]$Url)

$ErrorActionPreference = 'Stop'

function Falhar([string]$mensagem) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($mensagem, 'Conectar AnyDesk', 'OK', 'Warning') | Out-Null
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

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $exe
$psi.Arguments = "$id --with-password"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$processo = [System.Diagnostics.Process]::Start($psi)

# escreve os bytes direto (sem BOM) — equivale ao "echo senha | AnyDesk.exe ID --with-password"
$bytes = [Text.Encoding]::UTF8.GetBytes($senha + "`n")
$processo.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
$processo.StandardInput.Close()
