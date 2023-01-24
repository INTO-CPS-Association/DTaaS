Publish a base virtualbox package to be used by
vagrant to publish all other virtualbox packages

```bash
vagrant up

# let the provisioning be complete
# replace the vagrant ssh key-pair with personal one
vagrant ssh

# remove the vagrant default public key - first line of 
# /home/vagrant/.ssh/authorized_keys

# exit vagrant guest machine and then
# copy own private key to vagrant private key location
cp vagrant .vagrant/machines/default/virtualbox/private_key

# check
vagrant ssh	#should work

vagrant halt

vagrant package --base dtaas-base-box \
--info "info.json" --output dtaas-base-box.vagrant

# Add box to the vagrant cache in ~/.vagrant.d/boxes directory
vagrant box add --name dtaas-base-box ./dtaas-base-box.vagrant

# You can use this box in other vagrant boxes using
#config.vm.box = "dtaas-base-box"
```
