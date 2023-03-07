# copy the correct environment variables file to react SPA
# https://stackoverflow.com/questions/51653931/react-configuration-file-for-post-deployment-settings
# https://dev.to/akdevcraft/react-runtime-variables-49dc

mode=${REACT_APP_ENV-dev}
if [ -z "$mode" ]; then
    echo "Set REACT_APP_ENV to eiter dev or prod with:"
    echo "export REACT_APP_ENV=\"dev | test | prod\""
    exit 1
fi

set_env() {
    echo "Setting env to $1"
    cp config/$1.js public/env.js # Configure dev environment in public for next build
    if [ -d build ]; then
        cp public/env.js build/env.js # Hot swap dev to build
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
    *) echo "Invalid mode $mode - use 'dev' or 'prod'"
        exit 1
        ;;
esac
