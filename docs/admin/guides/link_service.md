# Link services to local ports

To link a port from the service machine (server2) to the local port on the host machine (server1). You can make a ssh link between these two.


#### 1. Go to the server on which you want to map to localhost
#### 2. Run the following command: 

```sh
ssh -fNT -L <local_port>:<destination>:<destination_port> <user>@<ssh_server>

```
Here's an example mapping the service port 5672 to localhost port 5672. 
```sh
ssh -fNT -L 5672:localhost:5672 vagrant@services.foo.com
```
