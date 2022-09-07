# copy the correct environment variables file to react SPA
# https://stackoverflow.com/questions/51653931/react-configuration-file-for-post-deployment-settings
# https://dev.to/akdevcraft/react-runtime-variables-49dc

# possible values are: development or production
mode=${NODE_ENV-development}

case "$mode" in 
#    dev) cp config/dev.js build/static/js/config.js
         ;;
esac