' Chamado pelo protocolo acessoanydesk: — roda o conectar.ps1 sem abrir janela de console
If WScript.Arguments.Count < 1 Then WScript.Quit 1

' só deixa passar os caracteres esperados no link (ID + senha em base64url),
' assim nada de fora consegue injetar coisa na linha de comando do PowerShell
Set re = New RegExp
re.Pattern = "[^A-Za-z0-9:/?=&%@._-]"
re.Global = True
url = re.Replace(WScript.Arguments(0), "")

pasta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & pasta & "\conectar.ps1"" """ & url & """"
CreateObject("WScript.Shell").Run cmd, 0, False
