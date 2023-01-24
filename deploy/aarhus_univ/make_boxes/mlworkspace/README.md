This is a box that has the following items:
* docker
* nodejs and yarn
* jupyter
* microk8s
* containers
    * mltooling/ml-workspace:0.13.2
    * traefik2.5
    * influxdb2.4
    * grafana
    * telegraf

Publish a base virtualbox package to be used by
vagrant to publish all other virtualbox packages

```bash
vagrant up

# let the provisioning be complete
# replace the vagrant ssh key-pair with personal one
vagrant ssh

# install the oh-my-zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
# install plugins: history, autosuggestions, 
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh

# inside ~/.zshrc, modify the following line
plugins=(git zsh-autosuggestions history cp tmux)

# remove the vagrant default public key - first line of 
# /home/vagrant/.ssh/authorized_keys

# exit vagrant guest machine and then
# copy own private key to vagrant private key location
cp vagrant .vagrant/machines/default/virtualbox/private_key

# check
vagrant ssh	#should work

vagrant halt

vagrant package --base dtaas-mlworkspace \
--info "info.json" --output dtaas-mlworkspace.vagrant

# Add box to the vagrant cache in ~/.vagrant.d/boxes directory
vagrant box add --name dtaas-mlworkspace ./dtaas-mlworkspace.vagrant

# You can use this box in other vagrant boxes using
#config.vm.box = "dtaas-mlworkspace"
```
