#!/bin/bash
# Installs necessary packages to create the docker environment for 
# executing the DTaaS application

apt-get update -y
apt-get upgrade -y

#install docker-compose from https://docs.docker.com/compose/install/other/
curl -SL "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

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
