# Keeps local server + fixed localtunnel URL alive while this PC is on.
# Stop when you say so (Ctrl+C) or close the window.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$subdomain = "thick-clubs-exist"
$port = 8765

function Ensure-Server {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { return }
  } catch {}
  Write-Host "Starting server..."
  Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "serve.py" -WorkingDirectory $root
  Start-Sleep -Seconds 3
}

Write-Host "Keep-online: https://$subdomain.loca.lt/"
Write-Host "PC off = link stops. For always-on internet hosting use Render (render.yaml)."
while ($true) {
  Ensure-Server
  Write-Host "$(Get-Date -Format HH:mm:ss) tunnel up..."
  npx --yes localtunnel --port $port --subdomain $subdomain
  Write-Host "Tunnel dropped, restarting in 3s..."
  Start-Sleep -Seconds 3
}
