#!/bin/bash
# Installs necessary packages to create the docker environment for
# executing the DTaaS application

export DEBIAN_FRONTEND=noninteractive

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
	python3-pip \
	python3-venv

# Make zsh the default shell for vagrant user
chsh -s /usr/bin/zsh vagrant

# Add Docker's official GPG key:
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y \
	docker-ce=5:28.5.2-1~ubuntu.24.04~noble \
	docker-compose-plugin

groupadd docker || true
usermod -aG docker vagrant || true
newgrp docker || true
service docker start
docker run hello-world

systemctl enable docker.service
systemctl enable containerd.service

# remove default route inserted by vagrant
printf "* * * * * ip route del default via 10.0.2.2 dev enp0s3\n" | crontab -
