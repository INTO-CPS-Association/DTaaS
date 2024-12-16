# DevOps in DTaaS

## GitLab

We use GitLab as an OAuth service provider, which enables users to securely
access the DTaaS website.

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

The `lifecycle` directory contains four files - `clean`, `create`, `execute`
and `terminate`, which are simple
[BASH scripts](https://www.gnu.org/software/bash/). These correspond to stages
in a digital twin's lifecycle.

![Digital Twin Lifecycle](./dt-lifecycle.png)

## CI/CD Pipelines

Continuous Integration (CI) and Continuous Deployment (CD) represent two key
components of the DevOps methodology.

CI involves frequent integration of code changes into a common repository.
Each integration triggers automated builds and tests that permit the detection
of issues at an early stage. This practice ensures that the changes made to
the code are checked fast enough, reducing the possibilities of integration
problems and hence ensuring high-quality software.

CD automates the process of release, ensuring that code changes are
automatically tested and prepared for deployment. Teams using CD can deploy
updates rapidly and reliably, improving the responsiveness and quality of
software. Performed together, CI/CD automates the whole delivery pipeline for
software, increasing efficiency and reducing errors. They entirely eliminate,
or significantly reduce, the manual human input required for a code change to
be moved from a commit to a production environment. The entire process of
compilation, testing (including unit, integration, and regression testing),
deployment, and infrastructure provisioning is included.

CI/CD practices are explained in more detail in
[this article by GitLab](https://about.gitlab.com/topics/ci-cd/).

A CI/CD pipeline is a series of automated processes that manage CI and CD of
software. They are configured to run automatically, with no need for manual
intervention once activated.

GitLab is a single application for the entire DevOps lifecycle, which means
it performs all of the basics required for CI/CD in one environment. The
[documentation provided by GitLab](https://docs.gitlab.com/ee/ci/pipelines/)
was instrumental in enabling a comprehensive understanding of the CI/CD
pipelines.

Pipelines are composed of a number of essential components. _Jobs_ delineate
the specific tasks to be accomplished, while _stages_ define the sequence in
which jobs are executed. In this way, stages ensure that each step takes place
in the right order and make the pipeline more efficient and consistent. In the
event that all jobs within a stage are successfully completed, the pipeline
will automatically proceed to the subsequent stage. However, if any of the
jobs fail, the flow is interrupted without proceeding.

When a pipeline is initiated, the jobs that have been defined within it are
then distributed among the available runners.

GitLab runners are agents within the GitLab Runner application that execute
the jobs in accordance with their configuration and the available resources.
They can be configured to operate on a variety of platforms, including virtual
machines, containers, and physical servers. They can also be managed locally
or in a cloud environment.

## Gitbeaker

[GitBeaker is a client library for Node.js](https://github.com/jdalrymple/gitbeaker)
that enables users to interact with the GitLab API. In particular,
`gitbeaker/rest` is a specific version of the Gitbeaker package that allows
users to submit requests to GitLab's REST API.

One of the most significant features of Gitbeaker is the provision of support
for a range of authentication methods, including the use of personal tokens
and OAuth keys. Gitbeaker provides a range of predefined methods for
requesting data from the various GitLab APIs, eliminating the need for users
to manually construct HTTP requests, thus greatly simplifying the integration
process with GitLab.

It automatically handles errors in HTTP requests (and provides meaningful error
messages that help diagnose and resolve problems) and is fully compatible with
all of GitLab's REST APIs.
