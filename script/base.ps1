# Check if Chocolatey is installed, if not, install it
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    # Check the current execution policy
    $currentExecutionPolicy = Get-ExecutionPolicy

    # Set execution policy to Bypass temporarily
    Set-ExecutionPolicy Bypass -Scope Process -Force

    # Download and install Chocolatey
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # Restore the original execution policy
    Set-ExecutionPolicy $currentExecutionPolicy -Scope Process -Force
}

# Install Git if not already installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
}

# Update all installed packages
choco upgrade all -y

# Check if docker-desktop is already installed
if (-not (Get-Command docker-desktop -ErrorAction SilentlyContinue)) {
    # Install docker for containers and microservices
    # https://docs.docker.com/engine/install/ubuntu/
    choco install -y docker-desktop

    $dockerDesktopPath = Join-Path $env:ProgramFiles "Docker\Docker\resources\cli-plugins"
    # Ensure docker-desktop is in the system path
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$dockerDesktopPath", [EnvironmentVariableTarget]::Machine)

    # Check if docker group exists, if not, create it
    $dockerGroup = 'docker'
    if (-not (Get-LocalGroup -Name $dockerGroup -ErrorAction SilentlyContinue)) {
        New-LocalGroup -Name $dockerGroup
    }

    # Add user to docker group if not already a member
    $user = $env:UserName
    if (-not (Get-LocalGroupMember -Group $dockerGroup -Member $user)) {
        Add-LocalGroupMember -Group $dockerGroup -Member $user
    }

    # Make docker available to the user account
    Write-Host "`n`n`nMake docker available to your user account....`n......."
    Write-Host "Your user account is: $user"
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
}

# Check if Node.js is already installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    # Install Node.js environment if not already installed
    choco install -y nvm
    $nvmInstallPath = Join-Path "C:\ProgramData" "nvm"
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$nvmInstallPath", [EnvironmentVariableTarget]::Machine)
    Write-Host "installing nvm"
}

# Install node
nvm install 22
nvm use 22


# Install Yarn
choco install -y yarn

# Install global npm packages
npm install -g serve
npm install -g pm2