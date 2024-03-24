# Install pre-commit using Chocolatey
choco install pre-commit -y

# Set up pre-commit hooks
if (Test-Path -Path ".git") {
    New-Item -Path ".git\hooks" -ItemType Directory -ErrorAction SilentlyContinue
    Copy-Item -Path "$env:ChocolateyInstall\lib\pre-commit\tools\hooks\*" -Destination ".git\hooks\" -Recurse -Force
    Write-Host "Git hooks setup successfully. See .git\hooks\ for more information."
} else {
    Write-Host "Error: The .git directory not found. Please make sure you are in the root directory of your Git repository."
}
