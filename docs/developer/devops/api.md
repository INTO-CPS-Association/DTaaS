# API Calls

A GitLab DevOps pipeline can be triggered via an API call using a
[pipeline trigger token](https://docs.gitlab.com/ee/ci/triggers/)
which is created on the GitLab instance, with the following values:

1. `<trigger_token>`: The user GitLab trigger token.
1. `<digital_twin_name>`: The name of the DT (e.g. mass-spring-damper).
1. `<runner_tag>`: The specific tag of the GitLab runner that the user wants to use.
1. `<project_id>`: The ID of the GitLab project, displayed in the project overview
   page.

The example given below sets the `DTName` variable to the desired DT name,
the `RunnerTag` variable to the specified GitLab Runner tag, and ensures the call
will be executed in the `main` branch:

```bash
    curl --request POST \
      --form "token=<trigger_token>" \
      --form ref=main \
      --form "variables[DTName]=<digital_twin_name>" \
      --form "variables[RunnerTag]=<runner_tag>" \
      "https://maestro.cps.digit.au.dk/gitlab/api/v4/projects/<project_id>/trigger/pipeline"
```

---

Ref: Vanessa Scherma, Design and implementation of an integrated DevOps
framework for Digital Twins as a Service software platform,
Master's Degree Thesis, Politecnico Di Torino, 2024.
