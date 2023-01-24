#!/bin/bash
#-------------
echo -e "\n\n Jupyter server provisioning script"

echo "\n\n start the jupyter notebook servers"

#Run this service in docker container
docker run -d \
  -p 8090:8080 \
  --name "ml-workspace-user-1" \
  -v "${PWD}/data/assets/user/1:/workspace" \
  -v "${PWD}/data/assets/shared:/workspace/shared:ro" \
  --env AUTHENTICATE_VIA_JUPYTER="" \
  --env WORKSPACE_BASE_URL="user/1" \
  --shm-size 512m \
  --restart always \
  mltooling/ml-workspace:0.13.2


#Run the next two services on the host
mkdir -p "$HOME/.jupyter"
cp -R "$PWD/servers/config/jupyter.conf/*" "$HOME/.jupyter"
sudo chown -R "$USER:$USER" "$HOME/.jupyter"
rm "$HOME/.jupyter/jupyter_notebook_config.json" #remove the password

cd "$PWD/data/assets/user/1"
nohup jupyter lab --port=8091 --notebook-dir=''  --LabApp.token='' \
 --ServerApp.base_url='host/1/lab' > /home/vagrant/jupyter-lab.log 2>&1 &

nohup jupyter notebook --port=8092 --notebook-dir='' \
 --NotebookApp.base_url='host/1/lib' > /home/vagrant/jupyter-notebook.log 2>&1 &


