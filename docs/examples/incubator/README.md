Installation of required python packages for the Incubator demo

```bash
pip install pyhocon
pip install influxdb_client
pip install scipy 
pip install pandas  
pip install pika  
pip install oomodelling 
pip install control  
pip install filterpy 
pip install sympy  
pip install docker  
```

start rabbitmq server and create a rabbitmq account with,

```txt
name: incubator  
password:incubator   
with access to the virtual host "/"
```

```bash
docker run -d \
 --name rabbitmq-server \
 -p 15672:15672 -p 5672:5672 \
 rabbitmq:3-management

docker exec rabbitmq-server rabbitmqctl add_user incubator incubator
docker exec rabbitmq-server rabbitmqctl set_permissions -p "/" incubator ".*" ".*" ".*"
```

Access InfluxDB running on another machine. Remember that InfluxDB works only on a distinct sub-domain name like `influx.foo.com`, but not on `foo.com/influx`.

```bash
ssh -i /vagrant/vagrant -fNT -L 40000:localhost:80 vagrant@influx.server2.com
```


Update the rabbitmq-server and influxdb configuration in 

```bash
/home/vagrant/dt/1/incubator/example_digital-twin_incubator/software/startup.conf
```

select (comment / uncomment) functions in  

```bash
/home/vagrant/dt/1/incubator/example_digital-twin_incubator/software/startup/start_all_services.py
```

Start the program

```bash
export PYTHONPATH="${PYTHONPATH}:/home/vagrant/dt/1/incubator/example_digital-twin_incubator/software/incubator"
cd /home/vagrant/dt/1/incubator/example_digital-twin_incubator/software
python3 -m startup.start_all_services
```
