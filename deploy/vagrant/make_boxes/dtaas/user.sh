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
    apache2-utils \
    net-tools \
    python3-dev \
    python3-pip

mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]
then
  curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  printf \
    "deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu %s stable" \
    "$(dpkg --print-architecture)" "$(lsb_release -cs)"  | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
groupadd docker || true
usermod -aG docker vagrant || true
newgrp docker || true
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service

apt-get update
apt-get install -y ca-certificates curl gnupg
mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/nodesource.gpg ]
then
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi
NODE_MAJOR=20
printf "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
  https://deb.nodesource.com/node_%s.x nodistro main" "$NODE_MAJOR" | \
  tee /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs
npm install -g npm@10.2.0

if [ ! -f /usr/share/keyrings/yarnkey.gpg ]
then
  curl -sL "https://dl.yarnpkg.com/debian/pubkey.gpg" | gpg --dearmor | \
    tee /usr/share/keyrings/yarnkey.gpg >/dev/null
  printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main \n" | \
    tee /etc/apt/sources.list.d/yarn.list
fi
apt-get update -y
apt-get install -y yarn
npm install -g serve

cat /vagrant/vagrant.pub >> /home/vagrant/.ssh/authorized_keys
mkdir -p /root/.ssh
cat /vagrant/vagrant.pub >> /root/.ssh/authorized_keys

# get the required docker images
docker pull traefik:v2.10
docker pull mltooling/ml-workspace-minimal:0.13.2
docker pull grafana/grafana:10.1.4
docker pull influxdb:2.7
docker pull rabbitmq:3-management
docker pull eclipse-mosquitto:2
docker pull mongo:7.0.3
docker pull gitlab/gitlab-ce:16.4.1-ce.0
