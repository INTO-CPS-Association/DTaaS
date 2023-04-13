#!/bin/sh



# Define the base directory

base_dir="/Home/Desktop/DTaaS"



# Check if anything is running on port 80 and stop it

process_ids=$(sudo lsof -t -i:80)



if [ ! -z "$process_ids" ]; then

    for process_id in $process_ids; do

        process_name=$(ps -p $process_id -o comm=)



        echo "Process using port 80, ending process: $process_name (ID: $process_id)"



        sudo kill $process_id

    done

fi



# Check if anything is running on port 8090 and stop it

process_ids=$(sudo lsof -t -i:8090)



if [ ! -z "$process_ids" ]; then

    for process_id in $process_ids; do

        process_name=$(ps -p $process_id -o comm=)



        echo "Process using port 8090, ending process: $process_name (ID: $process_id)"



        sudo kill $process_id

    done

fi



# Start Traefik

cd ../../../../servers/auth/gateway-test

traefik_command="docker run -d \

--network=host -v $PWD/traefik.yml:/etc/traefik/traefik.yml \

-v $PWD/dynamic:/etc/traefik/dynamic \

-v /var/run/docker.sock:/var/run/docker.sock \

traefik:v2.5"



sudo $traefik_command



# Start the microservice

cd ../

sudo ./start_docker.sh



# Run the test

cd ../../client/test/unitTests/Microservice

sudo ./Auth_test.sh