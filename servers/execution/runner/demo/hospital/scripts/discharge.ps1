# Command discharge: frees the bed of the patient of the input on stdin,
# {"patient": "p-1"}, and raises the event beds-free over HTTP, which
# reopens a full hospital
. "$PSScriptRoot\ward.ps1"
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$ward = Remove-Patient $request.patient
if ($null -eq $ward) {
  [Console]::Error.WriteLine("no patient $($request.patient)")
  exit 4
}
Write-Output "$($request.patient) left $ward"
$code = Send-Runner 'fsm/event' @{ event = 'beds-free' }
Write-Output "raised event beds-free, reply $code"
