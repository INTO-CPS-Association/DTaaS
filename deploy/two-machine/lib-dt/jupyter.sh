#!/bin/bash


#-------------
echo "\n\n start the jupyter notebook server"
sudo apt install -y python3-pip
sudo -H pip install jupyterlab
jupyter notebook --generate-config
jupyter notebook password

