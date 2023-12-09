#!/bin/bash
# copy the correct environment variables file to react SPA
# https://stackoverflow.com/questions/51653931/react-configuration-file-for-post-deployment-settings
# https://dev.to/akdevcraft/react-runtime-variables-49dc

mode=$1
if [ -z "$mode" ]; then
    printf "Use yarn configapp with either dev, prod, or test:\n"
    printf "i.e. \"yarn configapp dev\"\n"
    exit 1
fi

case "$mode" in
    dev)
        yarn config:dev
        ;;
    prod)
        yarn config:prod
        ;;
    test)
        yarn config:test
        ;;
    *)
        printf "Invalid mode $mode - use 'dev', 'prod', or 'test'\n"
        exit 1
        ;;
esac

exit 0

