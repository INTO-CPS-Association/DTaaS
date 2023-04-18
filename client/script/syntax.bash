#!/bin/bash
PATH="$(yarn bin):$PATH"
export PATH
printf "Running eslint"
eslint .
