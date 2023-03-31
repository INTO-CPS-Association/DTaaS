#!/bin/bash
printf "starting the node application"
#node build/index.js

# serve static site; can be run from production server
# serve -s <directory> -l <port>
serve -s build -l 4000