# Raises the event done and prints the status code of the reply, which
# is 0 when the runner can not be reached. Windows PowerShell 5.1 throws
# on a 4xx or 5xx reply, and 202 is the only success of the route.
# RUNNER_TOKEN is unset without access control, and the header ignored.
$headers = @{ Authorization = "Bearer $env:RUNNER_TOKEN" }
try {
  Invoke-RestMethod -Method Post -Uri "$env:RUNNER_URL/fsm/event" `
    -Headers $headers -ContentType 'application/json' `
    -Body '{"event": "done"}' | Out-Null
  $code = 202
} catch { $code = [int]$_.Exception.Response.StatusCode }
Write-Output $code
