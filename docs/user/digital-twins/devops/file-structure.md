# Digital Twin File Structure in GitLab

GitLab is the file store for DevOps on digital twins.
The [user interface page](ui.md) is a front end for this GitLab-backed
file storage.

Each DTaaS installation comes with an integrated GitLab. It must have
a GitLab group named **dtaas** and a GitLab repository for each
user, named after the username. For example,
if a DTaaS installation has two users, _user1_ and _user2_,
the following repositories must exist on the linked
GitLab installation.

```txt
https://intocps.org/gitlab/dtaas/common.git
https://intocps.org/gitlab/dtaas/user1.git
https://intocps.org/gitlab/dtaas/user2.git
```

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! warning
    By default, the assets shown on the Library Page and the Digital
    Twins Page come from the `master` branch of the backing GitLab
    project. Create a branch named `master` and make it the default
    branch in all the user repositories, including the common
    repository. A different branch can be set in the **Branch Name**
    field of the [settings](../../website/settings.md).
<!-- markdownlint-enable MD046 -->

Each user repository must have the following structure.

```text
<username>/
├── common/
├── data/
├── digital_twins/
├── functions/
├── models/
├── tools/
├── .gitlab-ci.yml
└── README.md
```

This is the same structure the user sees on the
**Library** page.

## Digital Twin Structure

The `digital_twins` folder contains DTs that one or more users have
built. They are meant to be flexible enough to be reconfigured for
specific use cases.

For an example of such a configuration, see the
[dtaas/user1 repository on gitlab.com](https://gitlab.com/dtaas/user1).
Its `digital_twins` directory contains a `hello_world` example with
this file structure:

```text
hello_world/
├── lifecycle/ (at least one lifecycle script)
│   ├── clean
│   ├── create
│   ├── execute
│   └── terminate
├── .gitlab-ci.yml (GitLab DevOps config for executing lifecycle scripts)
└── description.md (optional but is recommended)
└── README.md (optional but is recommended)
```

The `lifecycle` directory here contains four files, `clean`, `create`,
`execute` and `terminate`, which are simple
[BASH scripts](https://www.gnu.org/software/bash/).
They correspond to stages in a digital twin's lifecycle.
The [lifecycle stages](../lifecycle.md) page explains them further.

The `.gitlab-ci.yml` at the top of the user repository contains one
trigger job per digital twin. When the website executes a digital twin,
the matching trigger job runs the pipeline defined in that digital
twin's own `.gitlab-ci.yml`. Saving a new digital twin on the
**Create** tab adds its trigger job, and deleting a digital twin
removes it.
