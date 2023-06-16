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
printf \
  "deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  %s stable" "$(dpkg --print-architecture)" "$(lsb_release -cs)"  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
groupadd docker
usermod -aG docker "$USER"
#newgrp docker
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service



# Install nodejs environment
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get update -y
apt-get install -y yarn
npm install -g serve

# Install openssl for certificate generation
apt-get install -y wget openssl


# Install jupter toolchain
apt install -y python3-pip
sudo -H pip install jupyterlab

# Install playwright tool for integration tests on browsers
npx playwright install-deps

#-------------
printf "\n\n Install jupyter toolchain"
apt install -y python3-pip
sudo -H pip install jupyterlab
sudo -H pip install mkdocs
sudo -H pip3 install mkdocs-material
sudo -H pip3 install python-markdown-math

#install docker-compose from https://docs.docker.com/compose/install/other/
curl -SL "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
