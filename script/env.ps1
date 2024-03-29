# Install base dependencies from the script/base.sh file

# Install openssl for certificate generation
choco install -y openssl

# Install playwright tool for integration tests on browsers
# Ensure npm is added to PATH
if (-not ([Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -like "*npm*")) {
    Write-Host "Adding npm to PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$env:Path;$(npm prefix -g)\node_modules\.bin", [EnvironmentVariableTarget]::Machine)
}

npm install -g playwright

# Installing required python packages
choco install -y python3

# Ensure Python scripts directory is added to PATH
if (-not ([Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -like "*Python3*")) {
    Write-Host "Adding Python scripts to PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$env:Path;$(Get-Command python3 | Select-Object -ExpandProperty Directory)", [EnvironmentVariableTarget]::Machine)
}

# Install mkdocs
pip install mkdocs

# Install markdownlint
choco install markdownlint-cli

# Install mkdocs plugins
pip install mkdocs-material python-markdown-math mkdocs-open-in-new-tab mkdocs-with-pdf qrcode

# Ensure Python scripts directory is added to PATH (for pip)
if (-not ([Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -like "*Python3*")) {
    Write-Host "Adding Python scripts to PATH (for pip)..."
    [Environment]::SetEnvironmentVariable("Path", "$env:Path;$(Get-Command python3 | Select-Object -ExpandProperty Directory)", [EnvironmentVariableTarget]::Machine)
}

# Install shellcheck
choco install -y shellcheck

# Install madge for generating dependency graphs of typescript projects
npm install -g madge