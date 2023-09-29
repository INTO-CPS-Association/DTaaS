#!/bin/bash
PATH="$(yarn bin):$PATH"
export PATH
printf "Generate graph for source code"
madge --image src.svg --ts-config tsconfig.json --extensions ts,tsx src 
madge --image test.svg --ts-config tsconfig.json --extensions ts,tsx test 