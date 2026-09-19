$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$ports = @(8001, 8081)
$occupied = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $ports } |
  Select-Object LocalPort, OwningProcess -Unique

if ($occupied) {
  $details = ($occupied | ForEach-Object { "port $($_.LocalPort) (PID $($_.OwningProcess))" }) -join ', '
  throw "A project port is already in use: $details. Run .\stop-local.ps1 first, or stop the owning process manually."
}

Start-Process powershell.exe -WorkingDirectory (Join-Path $root 'backend') -ArgumentList @(
  '-NoExit',
  '-Command',
  '..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001'
)

Start-Process powershell.exe -WorkingDirectory (Join-Path $root 'mobile') -ArgumentList @(
  '-NoExit',
  '-Command',
  'npm run web -- --port 8081'
)

Write-Host 'Backend: http://localhost:8001/docs'
Write-Host 'Frontend: http://localhost:8081'
