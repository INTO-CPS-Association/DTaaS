#!/bin/bash
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env)
            env_variable="$2"
            shift
            ;;
        --username)
            username="$2"
            shift
            ;;
        *)
            echo "Unknown parameter passed: $1"
            exit 1
            ;;
    esac
    shift
done

set -e

if [ -n "$env_variable" ] ; then
  printf "environment: %s.\n" "$env_variable"
fi

printf "Install script for DTaaS software platform.\n"
printf "You can run the script multiple times until the installation succeeds.\n "
printf ".........\n \n \n "

printf "Install the required system software dependencies...\n "
printf ".........\n \n \n "
sudo apt-get update -y
sudo apt-get upgrade -y


# Install docker for containers and microservices
# https://docs.docker.com/engine/install/ubuntu/
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    zsh \
    apache2-utils \
    net-tools

sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]
then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  printf \
    "deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu %s stable" \
    "$(dpkg --print-architecture)" "$(lsb_release -cs)"  | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo groupadd docker || true
sudo usermod -aG docker "$USER" || true

printf "\n\n\nMake docker available to your user account....\n "
printf ".......\n "
printf "Your user account is member of:\n "
groups
printf "groups.\n "

printf "If your user account is a member of docker group, let the installation script continue.\n "
printf "Otherwise, exit this script and run the following command\n\n "
printf "sudo usermod -aG docker %s\n\n " "$USER"
printf "logout and login again. You can run this script again after login\n\n "
printf "Press Ctl+C if you need to complete the this task....\n "
printf "Waiting for 60 seconds....\n "
sleep 60

#newgrp docker
sudo service docker start
docker run hello-world

sudo systemctl enable docker.service
sudo systemctl enable containerd.service


sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/nodesource.gpg ]
then
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | \
    sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi
NODE_MAJOR=20
printf "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
  https://deb.nodesource.com/node_%s.x nodistro main" "$NODE_MAJOR" | \
  sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install -y nodejs
sudo npm install -g npm@10.2.0


if [ ! -f /usr/share/keyrings/yarnkey.gpg ]
then
  curl -sL "https://dl.yarnpkg.com/debian/pubkey.gpg" | gpg --dearmor | \
    sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
  printf "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] \
    https://dl.yarnpkg.com/debian stable main \n" | \
    sudo tee /etc/apt/sources.list.d/yarn.list
fi

sudo apt-get update -y
sudo apt-get install -y yarn
sudo npm install -g serve

printf "\n\n End of installing dependencies...\n\n\n "
#----

# get the required docker images
printf "Download the required docker images...\n "
printf ".........\n\n\n "
docker pull traefik:v2.10
docker pull mltooling/ml-workspace-minimal:0.13.2
printf "\n\n docker images successfully downloaded...\n \n \n "
#----

printf "NOTE\n "
printf "....\n "
printf "This script installs DTaaS with default settings.\n "
printf "The setup is good for testing but not for secure installation.\n "


printf "\n\nClone the DTaaS codebase\n "
printf "...........\n "
if [ -d DTaaS ]
then
  cd DTaaS || exit
else
  git clone https://github.com/INTO-CPS-Association/DTaaS.git DTaaS
  cd DTaaS || exit
  git fetch --all
  git checkout feature/distributed-demo
fi

TOP_DIR=$(pwd)

#-------------
printf "\n\n Build, configure and run the react website\n "
printf ".....\n "
cd "${TOP_DIR}/client" || exit
yarn install --production
yarn build

yarn config:dev
if [ -n "$env_variable" ] ; then
  cp "${TOP_DIR}/deploy/config/client/env.${env_variable}.js" build/env.js
else
  cp "${TOP_DIR}/deploy/config/client/env.js" build/env.js
fi
nohup serve -s build -l 4000 & disown

#-------------
printf "\n\n Install and run the lib microservice\n "
printf "...........\n "
sudo npm install -g @into-cps-association/libms

{
  printf "PORT='4001'\n "
  printf "MODE='local'\n "
  printf "LOCAL_PATH ='%s/files'\n " "$TOP_DIR"
  printf "LOG_LEVEL='debug'\n "
  printf "APOLLO_PATH='lib'\n "
  printf "GRAPHQL_PLAYGROUND='true'\n "
} > "${TOP_DIR}/deploy/config/lib"
nohup libms --config "${TOP_DIR}/deploy/config/lib" & disown


#-------------
printf "\n\n Start the user workspaces\n "
printf "...........\n "

if [ -n "$username" ] ; then
  cp -R "${TOP_DIR}/files/user1" "${TOP_DIR}/files/${username}"
  docker run -d \
  -p 8090:8080 \
    --name "ml-workspace-${username}" \
    -v "${TOP_DIR}/files/${username}:/workspace" \
    -v "${TOP_DIR}/files/common:/workspace/common" \
    --env AUTHENTICATE_VIA_JUPYTER="" \
    --env WORKSPACE_BASE_URL="${username}" \
    --shm-size 512m \
    --restart always \
    mltooling/ml-workspace-minimal:0.13.2 || true
else 
  docker run -d \
  -p 8090:8080 \
    --name "ml-workspace-user1" \
    -v "${TOP_DIR}/files/user1:/workspace" \
    -v "${TOP_DIR}/files/common:/workspace/common" \
    --env AUTHENTICATE_VIA_JUPYTER="" \
    --env WORKSPACE_BASE_URL="user1" \
    --shm-size 512m \
    --restart always \
    mltooling/ml-workspace-minimal:0.13.2 || true
fi


#-------------
printf "\n\n Start the traefik gateway server\n "
printf "...........\n "
cd "${TOP_DIR}/servers/config/gateway" || exit
cp "${TOP_DIR}/deploy/config/gateway/auth" auth
if [ -n "$env_variable" ] ; then
  cp "${TOP_DIR}/deploy/config/gateway/fileConfig.${env_variable}.yml" "dynamic/fileConfig.yml"
else
  cp "${TOP_DIR}/deploy/config/gateway/fileConfig.yml" "dynamic/fileConfig.yml"
fi

if [ -n "$username" ] ; then
  sed "s/user1/${username}/" "${TOP_DIR}/deploy/config/gateway/fileConfig.${env_variable}.yml" > "dynamic/fileConfig.yml"
fi

docker run -d \
 --name "traefik-gateway" \
 --network=host -v "$PWD/traefik.yml:/etc/traefik/traefik.yml" \
 -v "$PWD/auth:/etc/traefik/auth" \
 -v "$PWD/dynamic:/etc/traefik/dynamic" \
 -v /var/run/docker.sock:/var/run/docker.sock \
 --restart always \
 traefik:v2.10 || true


#----------
printf "\n\n Create crontabs to run the application in daemon mode.\n "
printf "...........\n "
cd "$TOP_DIR" || exit
bash deploy/create-cronjob.sh

printf "\n\n The installation is complete.\n\n\n "


printf "Continue with the application configuration.\n "
printf ".........\n\n\n "
if [[ "$env_variable" == "local" ]]; then
  printf "Remember to change Gitlab OAuth details to your \
  local settings in the following file.\n "
  printf "%s/client/build/env.js\n " "$TOP_DIR"
else
  printf "Remember to change foo.com and Gitlab OAuth details to your \
  local settings in the following files.\n "
  printf "1. %s/client/build/env.js\n " "$TOP_DIR"
  printf "2. %s/servers/config/gateway/dynamic/fileConfig.yml\n " "$TOP_DIR"
fi
