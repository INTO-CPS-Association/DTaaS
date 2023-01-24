#!/bin/bash
# Installs necessary packages to create the docker environment for 
# executing the DTaaS application

apt-get update -y
apt-get upgrade -y

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
usermod -aG docker vagrant
newgrp docker
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service

# get the required docker images
docker pull traefik:v2.5
docker pull influxdb:2.4
docker pull mltooling/ml-workspace:0.13.2

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get update -y
apt-get install -y nodejs
npm install -g serve

apt install -y python3-pip
sudo -H pip install jupyterlab

cd /vagrant
cat /vagrant/key.pub >> /home/vagrant/.ssh/authorized_keys
mkdir -p /root/.ssh
cat /vagrant/key.pub >> /root/.ssh/authorized_keys

echo "vagrant ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
