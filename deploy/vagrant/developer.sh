#!/bin/bash
# Installs necessary packages to create the docker environment for
# executing the DTaaS application

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get upgrade -y

# Install openssl and mkcert for certificate generation
# Note: Consider using mkcert as an alternative for local development certificates
# mkcert can be installed from: https://github.com/FiloSottile/mkcert
apt-get install -y wget openssl libnss3-tools
apt-get install -y ca-certificates curl gnupg

curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install nvm for vagrant user
sudo -u vagrant bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash'

# Source nvm and install node + global packages in a single shell
sudo -u vagrant bash << 'NODEEOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 24
nvm use 24
npm install -g yarn serve pm2 madge
NODEEOF

# Ensure nvm is available in .bashrc and .zshrc
NVM_LINES='export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"'

grep -q 'NVM_DIR' /home/vagrant/.bashrc || echo "$NVM_LINES" >> /home/vagrant/.bashrc
touch /home/vagrant/.zshrc
grep -q 'NVM_DIR' /home/vagrant/.zshrc || echo "$NVM_LINES" >> /home/vagrant/.zshrc
chown vagrant:vagrant /home/vagrant/.bashrc /home/vagrant/.zshrc

# Install playwright tool for integration tests on browsers
npx --yes playwright install-deps

#-------------
printf "\n\n Install jupyterlab and mkdocs"
# Create a python virtual environment for the vagrant user
sudo -u vagrant bash -c 'cd /home/vagrant && python3 -m venv ./dtaas-venv'
sudo -u vagrant bash -c 'cd /home/vagrant && ./dtaas-venv/bin/pip3 install jupyterlab mkdocs mkdocs-material python-markdown-math mkdocs-open-in-new-tab mkdocs-with-pdf qrcode'

# Install markdownlint
apt-get install -y rubygems
gem install mdl

# Install shellcheck
apt-get install -y shellcheck

# Install madge for generating dependency graphs of typescript projects
apt-get install -y graphviz
# madge is already installed via npm above
