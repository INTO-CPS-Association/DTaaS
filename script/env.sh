#!/bin/bash
source script/base.sh

# Install openssl for certificate generation
sudo apt-get install -y wget openssl


# Install playwright tool for integration tests on browsers
npx --yes playwright install-deps

#-------------
printf "\n\n Installing required python packages...."
sudo apt install -y python3-pip
sudo -H pip3 install mkdocs
sudo -H pip3 install mkdocs-material
sudo -H pip3 install python-markdown-math
sudo -H pip3 install mkdocs-open-in-new-tab
sudo -H pip3 install mkdocs-with-pdf
sudo -H pip3 install qrcode

# Install markdownlint
sudo apt-get install -y rubygems
sudo gem install mdl

# Install shellcheck
sudo apt-get install -y shellcheck

# Install madge for generating dependency graphs of typescript projects
sudo apt-get install -y graphviz
sudo npm install -g madge

