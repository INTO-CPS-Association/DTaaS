FROM node:20.10.0-slim

#! docker should be run from the root directory of the project

# Set the working directory inside the container
WORKDIR /dtaas/libms

# pull the libms package from npm registry
RUN npm i -g @into-cps-association/libms@0.3.1

COPY ./deploy/config/lib .

# Define the command to run your app
CMD ["libms"]
