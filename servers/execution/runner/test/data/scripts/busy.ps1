# Spins for about three seconds of CPU time, for the resource tests. The
# sampler is a second PowerShell, which needs a second or more to start.
$end = (Get-Date).AddSeconds(3)
while ((Get-Date) -lt $end) { }
