# State closed: admissions are closed
. "$PSScriptRoot\ward.ps1"
Write-WardLog "closed entry $($env:DT_ENTRY): admissions closed ($env:HINT)"
