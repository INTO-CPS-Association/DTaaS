#!/bin/bash
export PATH="$(yarn bin):$PATH"
printf "Running eslint"
eslint .
