$ErrorActionPreference = 'SilentlyContinue'

8001, 8081 | ForEach-Object {
  Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -gt 4 } |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      taskkill.exe /PID $_ /T /F | Out-Null
    }
}

Write-Host 'Stopped project servers on ports 8001 and 8081.'
