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
choco install -y mkdocs

# Ensure Ruby scripts directory is added to PATH
if (-not ([Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -like "*Ruby*")) {
    Write-Host "Adding Ruby scripts to PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$env:Path;$(Get-Command ruby | Select-Object -ExpandProperty Directory)", [EnvironmentVariableTarget]::Machine)
}

# Install ruby for gem command
choco install -y ruby

# Ensure Gem scripts directory is added to PATH
if (-not ([Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -like "*Gem*")) {
    Write-Host "Adding Gem scripts to PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$env:Path;$(Get-Command gem | Select-Object -ExpandProperty Directory)", [EnvironmentVariableTarget]::Machine)
}

# Install markdownlint
gem install mdl

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