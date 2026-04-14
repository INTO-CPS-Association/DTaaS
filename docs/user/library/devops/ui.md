# Reusable Assets and DevOps

[DevOps](https://en.wikipedia.org/wiki/DevOps) has been
a well established software development practice.
An experimental feature integrating DevOps
is being introduced in the DTaaS platform.

This feature requires specific installation setup.

1. [Integrated GitLab installation](../../../admin/gitlab/integration.md)
1. A valid GitLab repository for the logged in user. See
   an [example repository](https://gitlab.com/dtaas/user1). This repository
   can be cloned and customised as needed.
1. [A linked GitLab Runner](../../../admin/gitlab/runner-linux.md)
   to the user GitLab repository.

Once these requirements are satisfied, the **Library** page shows all
the reusable assets available stored in the linked GitLab repository.
An empty list is shown if there are no assets of a specific category.

![Empty list in Library preview page](empty-list.png)

The page gets populated with any existing assets. All available DTs
are shown in the following figure.

![Selected DT](dt_selection.png)

Any existing DT asset can be selected and it gets added to
the **Selection** pane on the right. After selecting all the required
assets, clicking on the _Proceed_ button transitions to
[DT create stage](../../digital-twins/devops/ui.md)
