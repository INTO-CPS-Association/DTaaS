#!/bin/bash
apt-get update -y
apt-get upgrade -y


# Install docker for containers and microservices
# https://docs.docker.com/engine/install/ubuntu/
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    zsh \
    apache2-utils

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
groupadd docker
usermod -aG docker "$USER"
newgrp docker
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service



# Install nodejs environment
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get update -y
apt-get install -y yarn
npm install -g serve

# Install openssl for certificate generation
apt-get install -y wget openssl


# Install jupter toolchain
sudo apt install -y python3-pip
sudo -H pip install jupyterlab

# Install playwright tool for integration tests on browsers
sudo npx playwright install-deps

#!/bin/bash


#-------------
echo "\n\n Install jupyter toolchain"
sudo apt install -y python3-pip
sudo -H pip install jupyterlab
