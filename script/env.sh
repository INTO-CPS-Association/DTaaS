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
    net-tools

sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]
then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo printf \
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



# Install nodejs environment
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

if [ ! -f /usr/share/keyrings/yarnkey.gpg ]
then
  curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
  printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
fi

sudo apt-get update -y
sudo apt-get install -y yarn
sudo npm install -g serve

# Install openssl for certificate generation
sudo apt-get install -y wget openssl


# Install playwright tool for integration tests on browsers
npx playwright install-deps

#-------------
printf "\n\n Installing required python packages...."
apt install -y python3-pip
sudo -H pip3 install mkdocs
sudo -H pip3 install mkdocs-material
sudo -H pip3 install python-markdown-math
sudo -H pip3 install mkdocs-open-in-new-tab
sudo -H pip3 install mkdocs-with-pdf
sudo -H pip3 install qrcode

# Install markdownlint
sudo gem install mdl