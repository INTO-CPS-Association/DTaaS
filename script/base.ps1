# Install Chocolatey if not already installed
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    $installDir = Join-Path $env:USERPROFILE "choco"
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString("https://chocolatey.org/install.ps1")) -installDirectory $installDir
}

# Install Git if not already installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
}

# Update and upgrade system
choco upgrade all -y

# Install docker for containers and microservices
# https://docs.docker.com/engine/install/ubuntu/
choco install -y docker-desktop

# Add user to docker group
$user = $env:UserName
$dockerGroup = 'docker'
if ($null -eq (Get-LocalGroupMember -Group $dockerGroup -Member $user)) {
    Add-LocalGroupMember -Group $dockerGroup -Member $user
}

# Make docker available to the user account
Write-Host "`n`n`nMake docker available to your user account....`n......."
Write-Host "Your user account is a member of:"
Write-Host (Get-LocalGroupMember -Group $user | Select-Object Name)
Write-Host "If your user account is a member of the docker group, let the installation script continue."
Write-Host "Otherwise, exit this script and run the following command:`n"
Write-Host "Add-LocalGroupMember -Group docker -Member $user`n"
Write-Host "Log out and log in again. You can run this script again after login.`n"

# Wait for user action
Write-Host "Press Ctl+C if you need to complete this task...."
Write-Host "Waiting for 60 seconds...."
Start-Sleep -Seconds 60

# Start Docker service
Start-Service -Name "com.docker.service"

# Test Docker installation
docker run hello-world

# Enable Docker service
Set-Service -Name "com.docker.service" -StartupType Automatic

# Install docker-compose from https://docs.docker.com/compose/install/other/
$url = "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-windows-x86_64.exe"
$outputPath = Join-Path $env:ProgramFiles "Docker\docker-compose.exe"
Invoke-WebRequest -Uri $url -OutFile $outputPath
# Ensure docker-compose is in the system path
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$outputPath", [EnvironmentVariableTarget]::Machine)

# Install Node.js environment
choco install -y nodejs-lts
npm install -g npm@10.2.0

# Install Yarn
choco install -y yarn

# Install global npm packages
npm install -g serve
npm install -g pm2