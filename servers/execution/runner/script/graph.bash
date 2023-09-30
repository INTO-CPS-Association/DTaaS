#!/bin/bash
PATH="$(yarn bin):$PATH"
export PATH
printf "Generate dependency graph for code"

madge --image src.svg src
madge --image test.svg test
