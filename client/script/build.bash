#!/bin/bash
PATH="$(yarn bin):$PATH"
export PATH
#babel ./src --out-dir build --copy-files
react-scripts build
