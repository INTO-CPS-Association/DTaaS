# DTaaS Library Microservice

This document provides an overview of the lib microservice and explains its file structure, usage, and setup. The lib microservice is designed to manage and serve files, functions, and models to users, allowing them to access and interact with various resources.

I will be referring to the slides 23-27 from [this presentation](/docs/DTaaS-overview.pdf), throughout, so feel free to look through it to gain a better understanding.

## Overview

The lib microservice is responsible for handling and serving the contents of the functions and models. It provides API endpoints for clients to query, fetch, and interact with these resources. The microservice is built using the NestJS framework and leverages the Apollo GraphQL server to provide a flexible and efficient way to query data.

By looking into the servers/lib directory, you can find the main components and modules that make up the microservice:

- src/files: This directory contains the main service (files.service.ts) responsible for handling the logic of fetching and serving files. It supports both local and GitLab modes for fetching files, which can be seen in the figure image below
- src/app.module.ts: The main application module, which imports the necessary modules and providers for the microservice.
- src/main.ts: The entry point of the microservice, which bootstraps the NestJS application.

## File Structure

The lib microservice follows a specific file structure to organize functions and models. This can be see below, which are images from [this presentation](/docs/DTaaS-overview.pdf).

An example of the structure is as follows:

```
lib/
  functions/
    function1/ (ex: graphs)
      filename (ex: graphs.py)
      README.md
    function2/ (ex: statistics)
      filename (ex: statistics.py)
      README.md
    ...
  models/
    model1/ (ex: spring)
      filename (ex: spring.fmu)
      README.md
    model2/ (ex: building)
      filename (ex: building.skp)
      README.md
    ...
```

## Functions

Functions are organized in individual folders within the functions directory. Each function folder should contain a Python script implementing the function and a README.md file describing the purpose, inputs, outputs, and usage of the function.

## Models

Models are organized in individual folders within the models directory. Each model folder should contain a file representing the model (e.g., FMU or SKP files) and a README.md file describing the model, its purpose, and its usage.

## Setup

To set up the lib microservice, follow these steps:

1. Clone the DTaaS repository:

```
git clone https://github.com/INTO-CPS-Association/DTaaS.git
```

2. Navigate to the lib microservice directory:

```
cd DTaaS/server/lib
```

3. Install the required dependencies:

```
yarn install
```

4. Create a `.env` file in the `lib` directory with the required environment variables

## Environment Variables

To set up the environment variables for the lib microservice, create a new file named .env in the servers/lib folder. Then, add the following variables and their respective values:

```
MODE=<local or gitlab>
LOCAL_PATH=<path_to_your_local_files>
GITLAB_URL=<gitlab_api_url>
TOKEN=<your_gitlab_token>
GITLAB_GROUP=<your_gitlab_group_name>
```

Replace the values within the angle brackets (<>) with the appropriate values for your setup.

5. Start the microservice:

```
yarn start
```

The lib microservice is now running and ready to serve files, functions, and models.

You can access the server's endpoint by typing in the following URL:

```
localhost:<PORT>/graphql
```

For more information about the lib microservice, refer to the source code and other documentation in the DTaaS repository.
