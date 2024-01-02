#!/bin/bash
sudo apt-get update -y
sudo apt-get upgrade -y


# Install docker for containers and microservices
# https://docs.docker.com/engine/install/ubuntu/
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    zsh \
    apache2-utils \
    net-tools \
    python3-dev \
    python3-pip

sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]
then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  printf \
  "deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  %s stable" "$(dpkg --print-architecture)" "$(lsb_release -cs)"  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo groupadd docker || true
sudo usermod -aG docker "$USER" || true

printf "\n\n\nMake docker available to your user account....\n"
printf ".......\n"
printf "Your user account is member of:\n"
groups
printf "groups.\n"

printf "If your user account is a member of docker group, let the installation script continue.\n"
printf "Otherwise, exit this script and run the following command\n\n"
printf "sudo usermod -aG docker %s\n\n" "$USER"
printf "logout and login again. You can run this script again after login\n\n"
printf "Press Ctl+C if you need to complete the this task....\n"
printf "Waiting for 60 seconds....\n"
sleep 60


#newgrp docker
sudo service docker start
docker run hello-world

sudo systemctl enable docker.service
sudo systemctl enable containerd.service


#install docker-compose from https://docs.docker.com/compose/install/other/
sudo curl -SL "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo chmod 755 /usr/local/bin/docker-compose /usr/bin/docker-compose


# Install nodejs environment
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/nodesource.gpg ]
then
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | \
    sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi
NODE_MAJOR=20
printf "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
  https://deb.nodesource.com/node_%s.x nodistro main" "$NODE_MAJOR" | \
  sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt-get update
sudo apt-get install -y nodejs
sudo npm install -g npm@10.2.0


if [ ! -f /usr/share/keyrings/yarnkey.gpg ]
then
  curl -sL "https://dl.yarnpkg.com/debian/pubkey.gpg" | gpg --dearmor | \
    sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
  printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main \n" | \
    sudo tee /etc/apt/sources.list.d/yarn.list
fi

sudo apt-get update -y
sudo apt-get install -y yarn
sudo npm install -g serve
