# Starts a PowerShell that spins for about three seconds and waits for it,
# for the tests of the process tree. A native command in the foreground
# is waited for, so no process outlives the script.
powershell.exe -NoProfile -NonInteractive -Command '$end = (Get-Date).AddSeconds(3); while ((Get-Date) -lt $end) { }'
