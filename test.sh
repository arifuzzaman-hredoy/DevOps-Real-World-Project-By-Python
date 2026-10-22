
$LogFile = Join-Path $env:TEMP "devops-project-logs.txt"

docker compose logs --since 2h --timestamps nginx api db 2>&1 |
    Tee-Object -FilePath $LogFile |
    Select-String -Pattern 'error|exception|traceback|critical|failed|failure|refused|timeout|denied|warning|500|502|503|504|could not connect|connection reset' -CaseSensitive:$false

Write-Host "`nFull logs saved to: $LogFile" -ForegroundColor Green
