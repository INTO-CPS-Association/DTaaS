#!/bin/bash
# copy the correct environment variables file to react SPA
# https://stackoverflow.com/questions/51653931/react-configuration-file-for-post-deployment-settings
# https://dev.to/akdevcraft/react-runtime-variables-49dc
mode=$1
if [ -z "$mode" ]; then
    printf "Use yarn configapp with either dev, prod or test:"
    printf "i.e. \"yarn configapp dev\" "
    exit 1
fi

set_env() {
    printf "Setting env to %s" "$1"
    cp "config/$1.js" "public/env.js" # Configure dev environment in public for next build
    if [ -d build ]; then
        cp "public/env.js" "build/env.js" # Hot swap dev to build
    fi
}

case "$mode" in

dev)
    set_env dev
    ;;
prod)
    set_env prod
    ;;
test)
    set_env test
    ;;
*)
    echo "Invalid mode $mode - use 'dev', 'prod' or 'test'"
    exit 1
    ;;
esac

exit 0
