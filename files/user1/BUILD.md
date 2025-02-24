This document describes the conventions used in the `.gitlab-ci.yml` file and provides instructions on how to manually trigger Digital Twins (DTs).

## Conventions Used in `.gitlab-ci.yml`

The `.gitlab-ci.yml` file is configured to handle triggers for various Digital Twins present in the repository. Each trigger is associated with a specific DT and is activated based on the value of the `DTName` environment variable.

### Stages

The file defines a single stage called `triggers`, which is responsible for triggering other pipelines based on the specified Digital Twin.

### Variables
Two variables are used within the pipelines:

- `DTName` to determine which Digital Twin's pipeline to trigger.

- `RunnerTag` to specify a custom runner tag. It will execute each job in the Digital Twin's pipeline.


## Trigger the execution of a Digital Twin

There are separate trigger jobs for each Digital Twin. These jobs use conditional logic (`rules`) to include the appropriate `.gitlab-ci.yml` file based on the value of `DTName`.

Regardless of the image provided in the parent pipeline, each child pipeline will use its own specified image or default to Ruby.

### Using the GitLab API

It is possible to manually trigger a Digital Twin's pipeline using an API call, setting the `DTName` variable to the desired Digital Twin's name and the `RunnerTag` to specify the GitLab runner.

The branch where the call will be executed is the main.

```
curl --request POST \
  --form "token=<your_access_token>" \
  --form ref=main \
  --form "variables[DTName]=<digital_twin_name>" \
  --form "variables[RunnerTag]=<runner_tag>" \
  "https://maestro.cps.digit.au.dk/gitlab/api/v4/projects/<project_id>/trigger/pipeline"
```


You can also pass the <token> in the query string: 

```
curl --request POST \
  --form "variables[DTname]=<digital_twin_name>"\
  --form "variables[RunnerTag]=<runner_tag>" \
  "https://maestro.cps.digit.au.dk/gitlab/api/v4/projects/<project_id>/trigger/pipeline?token=<token>&ref=main"
```


Replace the placeholders with your actual values:
  - <your_access_token>: Your GitLab trigger token.
  - <digital_twin_name>: The name of the Digital Twin (e.g., hello-world or mass-spring-damper).
  - <runner_tag>: The specific tag of the GitLab runner you want to use.
  - <project_id>: The ID of the GitLab project, displayed in the project overview page.
