# Check if pip is available
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    Write-Host "Error: pip is not installed. Please install pip before running this script."
    exit 1
}

# Install pre-commit using pip
pip install pre-commit
pre-commit install