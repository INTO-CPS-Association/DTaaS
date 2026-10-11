#!/bin/bash
source script/base.sh
source script/nvm.sh

# Install openssl for certificate generation
sudo apt-get install -y wget openssl


# Install playwright tool for integration tests on browsers
npx --yes playwright install-deps

#-------------
printf "\n\n Installing required python packages...."
python3 -m venv ./dtaas-venv

chmod +x ./dtaas-venv/bin/activate
./dtaas-venv/bin/activate

./dtaas-venv/bin/pip3 install mkdocs
./dtaas-venv/bin/pip3 install mkdocs-material
./dtaas-venv/bin/pip3 install python-markdown-math
./dtaas-venv/bin/pip3 install mkdocs-open-in-new-tab
./dtaas-venv/bin/pip3 install mkdocs-with-pdf
./dtaas-venv/bin/pip3 install qrcode

deactivate

# Install markdownlint
sudo apt-get install -y rubygems
sudo gem install mdl

# Install shellcheck
sudo apt-get install -y shellcheck

# Install madge for generating dependency graphs of typescript projects
sudo apt-get install -y graphviz
