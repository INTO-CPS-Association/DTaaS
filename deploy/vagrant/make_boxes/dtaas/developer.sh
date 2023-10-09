#!/bin/bash
# Installs necessary packages to create the docker environment for 
# executing the DTaaS application

apt-get update -y
apt-get upgrade -y

#install docker-compose from https://docs.docker.com/compose/install/other/
curl -SL "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
chmod 755 /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install openssl for certificate generation
apt-get install -y wget openssl

# Install playwright tool for integration tests on browsers
npx --yes playwright install-deps

#-------------
printf "\n\n Install jupyterlab and mkdocs"
pip install jupyterlab
pip install mkdocs
pip3 install mkdocs-material
pip3 install python-markdown-math
pip3 install mkdocs-open-in-new-tab
pip3 install mkdocs-with-pdf
pip3 install qrcode

# Install minimal Kubernetes cluster
snap install microk8s --classic
usermod -a -G microk8s vagrant
chown -f -R vagrant ~/.kube
newgrp microk8s

# get the required docker images
docker pull telegraf:1.28.2

# Install markdownlint
sudo apt-get install -y rubygems
sudo gem install mdl

# Install madge for generating dependency graphs of typescript projects
sudo apt-get install -y graphviz
sudo npm install -g madge