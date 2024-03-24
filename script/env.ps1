# Install base dependencies from the script/base.sh file

# Install openssl for certificate generation
choco install -y openssl

# Check if Node.js is installed, if not, install it
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install -y nodejs
}

# Wait for a few seconds to allow the system to settle
Write-Host "Waiting for the system to settle..."
Start-Sleep -Seconds 10

# Install playwright tool for integration tests on browsers
npm install -g playwright

# Check if npm is installed properly
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm installation failed. Please make sure Node.js is installed properly."
    exit
}

# Installing required python packages
choco install -y python3
choco install -y mkdocs
choco install -y ruby
choco install -y graphviz
gem install mdl

# Install mkdocs plugins
pip install mkdocs-material python-markdown-math mkdocs-open-in-new-tab mkdocs-with-pdf qrcode

# Install shellcheck
choco install -y shellcheck

# Check if madge is installed, if not, install it
if (-not (Get-Command madge -ErrorAction SilentlyContinue)) {
    npm install -g madge
}

# Check if a reboot is necessary and prompt the user
if (Test-Path "C:\Windows\Temp\PendingReboot.txt") {
    Write-Host "A reboot is necessary. Please reboot your system at your earliest convenience."
}