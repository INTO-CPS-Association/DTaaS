# Install base dependencies from the script/base.sh file

# Install openssl for certificate generation
choco install -y openssl

# Install playwright tool for integration tests on browsers
npm install -g playwright

# Installing required python packages
choco install -y python3
choco install -y mkdocs
choco install -y ruby
choco install -y graphviz
gem install mdl

# Install mkdocs plugins
pip install mkdocs-material python-markdown-math mkdocs-open-in-new-tab mkdocs-with-pdf qrcode

# Install shellcheck
choco install -y shellcheck

# Install madge for generating dependency graphs of typescript projects
npm install -g madge
