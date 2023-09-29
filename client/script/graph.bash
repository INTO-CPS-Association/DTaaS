#!/bin/bash
PATH="$(yarn bin):$PATH"
export PATH
printf "Generate dependency graph for code"

madge --image src.svg src
madge --image test.svg test
#eval madge --image src.svg "$TS_CONFIG" "$EXTENSIONS" src 
#madge --image test.svg --ts-config tsconfig.json --extensions ts,tsx test 