# Spins for about eight seconds of CPU time, for the resource tests. The
# sampler is a second PowerShell, which needs several seconds to start
# on a host loaded by the other test workers.
$end = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $end) { }
