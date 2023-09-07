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
printf \
  "deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  %s stable \n" "$(dpkg --print-architecture)" "$(lsb_release -cs)"  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
groupadd docker
usermod -aG docker vagrant
newgrp docker
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service

#install docker-compose from https://docs.docker.com/compose/install/other/
sudo curl -SL "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main \n" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get update -y
apt-get install -y yarn
npm install -g serve

#-------------
printf "\n\n Install jupyter toolchain"
sudo apt-get install -y python3-pip
sudo -H pip install jupyterlab
sudo -H pip install mkdocs
sudo -H pip3 install mkdocs-material
sudo -H pip3 install python-markdown-math
sudo -H pip3 install mkdocs-open-in-new-tab
sudo -H pip3 install mkdocs-with-pdf
sudo -H pip3 install qrcode

# Install minimal Kubernetes cluster
snap install microk8s --classic
usermod -a -G microk8s vagrant
chown -f -R vagrant ~/.kube
newgrp microk8s

cat /vagrant/vagrant.pub >> /home/vagrant/.ssh/authorized_keys
mkdir -p /root/.ssh
cat /vagrant/vagrant.pub >> /root/.ssh/authorized_keys

# get the required docker images
docker pull traefik:v2.5
docker pull influxdb:2.4
docker pull mltooling/ml-workspace:0.13.2
docker pull grafana/grafana
docker pull telegraf
docker pull gitlab/gitlab-ce:15.10.0-ce.0

