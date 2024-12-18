# Digital Twin File Structure in Gitlab

We use GitLab as a file store for performing DevOps on Digital Twins.
The [user interface page](ui.md) is a front-end for this gitlab-backed
file storage.

Each DTaaS installation comes with an integrated Gitlab. There must
be a gitlab group named **dtaas** and a gitlab repository for each
user where repository name matches the username. For example,
if there are two users, namely _user1_ and _user2_ on a DTaaS
installation, then the following repositories must exist on the linked
Gitlab installation.

```txt
https://foo.com/gitlab/dtaas/common.git
https://foo.com/gitlab/dtaas/user1.git
https://foo.com/gitlab/dtaas/user2.git
```

Each user repository must also have a specific structure. The required structure
is as follows.

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

This file structure follows the same pattern user sees on the existing
**Library** page.

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
and `terminate`, which are executable scripts. The `hello-world` example uses
simple [BASH scripts](https://www.gnu.org/software/bash/).
These correspond to stages in a digital twin's lifecycle.
Further explanation of digital twin is available on
[lifecycle stages](../lifecycle.md).
