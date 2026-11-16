# Command admit: books a bed for the patient of the input on stdin,
# {"patient": "p-1", "ward": "cardiology"}, in that ward, or under the
# multi scope in any ward. Without a bed, it escalates to the Manager,
# proposing the multi scope if it is not yet in use, and fails.
. "$PSScriptRoot\ward.ps1"
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Write-Output "$env:DT_ID in state $env:DT_STATE#$env:DT_ENTRY, scope $env:DT_PARAM_SCOPE"
$ward = Find-Bed $request.ward $env:DT_PARAM_SCOPE
if ($null -eq $ward) {
  $escalation = @{ reason = "no $($request.ward) bed for $($request.patient)" }
  if ($env:DT_PARAM_SCOPE -eq 'single') { $escalation.proposal = @{ scope = 'multi' } }
  $code = Send-Runner 'escalate' $escalation
  [Console]::Error.WriteLine("no free bed for $($request.patient); escalated: $code")
  exit 3
}
Add-Patient $ward $request.patient
Write-Output "$($request.patient) admitted to $ward"
