This is a box that has the following items:
* docker
* nodejs and npm
* jupyter
* containers
    * mltooling/ml-workspace:0.13.2
    * traefik2.5
    * influxdb2.4

Publish a base virtualbox package to be used by
vagrant to publish all other virtualbox packages

```bash
#create a key pair
ssh-keygen -b 4096 -t rsa -f key -q -N ""

vagrant up

# let the provisioning be complete
# replace the vagrant ssh key-pair with personal one
vagrant ssh

# remove the vagrant default public key - first line of 
# /home/vagrant/.ssh/authorized_keys

# exit vagrant guest machine and then
# copy own private key to vagrant private key location
cp key .vagrant/machines/default/virtualbox/private_key

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
