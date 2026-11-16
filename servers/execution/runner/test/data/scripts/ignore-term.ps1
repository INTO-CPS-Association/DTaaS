# Windows ends powershell.exe at once on a stop, so this is the loop
# of the POSIX version without its SIGTERM trap
while ($true) { Start-Sleep -Milliseconds 100 }
