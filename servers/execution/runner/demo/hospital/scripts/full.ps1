# State full: no free bed is left. The patients can go to a peer that is
# open, which GET /peers tells; without one, the script fails, and as
# the state has no $failure transition, the runner escalates to the
# Manager.
. "$PSScriptRoot\ward.ps1"
$overflow = Get-Overflow
if ($overflow -ne 'none') {
  Write-WardLog "full   entry $($env:DT_ENTRY): no free bed, overflow to $overflow"
  exit 0
}
Write-WardLog "full   entry $($env:DT_ENTRY): no free bed and no open peer"
[Console]::Error.WriteLine('no local adaptation left and no open peer')
exit 2
