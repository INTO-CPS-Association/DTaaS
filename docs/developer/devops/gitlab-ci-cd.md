# GitLab CI/CD Infrastructure

Given that files in the Library are stored in a Git repository, the approach
employed was that of GitLab's parent-child pipelines. In this context, a parent
pipeline initiates the execution of another pipeline within the same project,
the latter of which is known as the child pipeline. More about pipelines can be
found in
[GitLab's documentation on CI/CD Pipelines](https://docs.gitlab.com/ee/ci/pipelines/).

Additionally, we use GitLab as an OAuth service provider, which enables users to
securely access the DTaaS website.<br>
Each user is allocated a personal folder on the GitLab platform, which is
organized in subfolders to facilitate the management of their DTs assets.
A user's personal folder has the following structure:

```text
<username>/
├── common/
├── data/
├── digital_twins/
├── functions/
├── models/
├── tools/
├── .gitlab-ci.yml
├── BUILD.md
└── README.md
```

## Parent Pipeline

The parent pipeline was configured as a top-level element. There is a single
stage called `triggers`, which is responsible for triggering other child
pipelines.

In the `.gitlab-ci.yml` file, triggers are managed for DTs inside the user
repository. Each trigger is connected with one distinct DT and becomes active
when the corresponding value of the `DTName` variable is provided by the API
call. The `RunnerTag` variable is used to specify a custom runner tag that will
execute each job in the DT's pipeline.

Below is an explanation of the keywords used in the CI/CD pipeline configuration:

- **Image**: Specifies the Docker image, such as `fedora:41`, providing the
  environment for the pipeline execution.
- **Stages**: Defines phases in the pipeline, such as triggers, organizing tasks
  sequentially.
- **Trigger**: Initiates another pipeline or job, incorporating configurations
  from an external file.
- **Include**: Imports configurations from another file for modular pipeline
  setups.
- **Rules**: Sets conditions for job execution based on variables or states.
- **If**: A condition within rules specifying when a job should run based on the
  value of a variable.
- **When**: Specifies the timing of job execution, such as `always`.
- **Variables**: Defines dynamic variables, like `RunnerTag`, used in the
  pipeline.

Here is an example of such a YAML file that registers a trigger for a DT named
`mass-spring-damper`:

```yaml
image: fedora:41

stages:
  - triggers

trigger_mass-spring-damper:
  stage: triggers
  trigger:
    include: digital_twins/mass-spring-damper/.gitlab-ci.yml
  rules:
    - if: '$DTName == "mass-spring-damper"'
      when: always
  variables:
    RunnerTag: $RunnerTag
```

## Digital Twin Structure

The `digital_twins` folder contains DTs that have been pre-built by one or
more users. The intention is that they should be sufficiently flexible to be
reconfigured as required for specific use cases.

Let us look at an example of such a configuration. The
[dtaas/user1 repository on gitlab.com](https://gitlab.com/dtaas/user1) contains
the `digital_twins` directory with a `hello_world` example. Its file structure
looks like this:

```text
hello_world/
├── lifecycle/
│   ├── clean
│   ├── create
│   ├── execute
│   └── terminate
├── .gitlab-ci.yml
└── description.md
```

The `lifecycle` directory here contains four files - `clean`, `create`,
`execute` and `terminate`, which are simple
[BASH scripts](https://www.gnu.org/software/bash/). These correspond to stages
in a digital twin's lifecycle.

![Digital Twin Lifecycle](./images/dt-lifecycle.png)

## Child Pipelines

To automate the lifecycle of DT, a child pipeline has been incorporated into
its corresponding folder. Regardless of the image provided in the parent
pipeline, each child pipeline will use its own specified image specified in
its YAML configuration or Ruby's default image.

The following are the explanations of the keywords used within the CI/CD child
pipeline based on
[GitLab's CI/CD YAML syntax reference](https://docs.gitlab.com/ee/ci/yaml/):

1. `Stage`
   It defines the steps that happen in a pipeline sequentially, for example,
   create, execute and clean, to make sure that tasks occur in a specific order.
1. `Script`
   It lists commands to be run at each step; for example, changing directories,
   modifying permissions, or running lifecycle scripts.
1. `Tags`
   It specifies which runner should run the jobs, thereby providing an
   additional control over where and how the jobs are run.

With the DT `mass-spring-damper` serving as a point of reference,
the stages in question are designed to facilitate the creation, execution, and
termination of the DT simulation, as well as the cleaning and restoration of the
environment to ensure its readiness for future executions. Here is an example of
a configuration that defines `create`, `execute` and `clean` as part of the
child pipeline:

```yaml
image: ubuntu:20.04

stages:
    - create
    - execute
    - clean

create_mass-spring-damper:
    stage: create
    script:
        - cd digital_twins/mass-spring-damper
        - chmod +x lifecycle/create
        - lifecycle/create
    tags:
        - $RunnerTag

execute_mass-spring-damper:
    stage: execute
    script:
        - cd digital_twins/mass-spring-damper
        - chmod +x lifecycle/execute
        - lifecycle/execute
    tags:
        - $RunnerTag

clean_mass-spring-damper:
    stage: clean
    script:
        - cd digital_twins/mass-spring-damper
        - chmod +x lifecycle/terminate
        - chmod +x lifecycle/clean
        - lifecycle/terminate
    tags:
        - $RunnerTag
```

---

Ref: Vanessa Scherma, Design and implementation of an integrated DevOps
framework for Digital Twins as a Service software platform,
Master's Degree Thesis, Politecnico Di Torino, 2024.
