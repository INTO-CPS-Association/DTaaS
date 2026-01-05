# Reusable Assets and DevOps

[DevOps](https://en.wikipedia.org/wiki/DevOps) has been
a well established software development practice.
We are bringing out an experimental feature of integration DevOps
in the DTaaS.

This feature requires specific installation setup.

1. [Integrated gitlab installation](../../../admin/gitlab/integration.md)
1. A valid gitlab repository for the logged in user. Please see
   an [example repository](https://gitlab.com/dtaas/user1). You can clone
   this repository and customize to your needs.
1. [A linked Gitlab Runner](../../../admin/gitlab/runner.md)
   to the user gitlab repository.

Once these requirements are satisfied, the **Library** page shows all
the reusable assets available stored in the linked gitlab repository.
An empty list is shown if there are no assets of a specific category.

![Empty list in Library preview page](empty-list.png)

The page gets populated with any existing assets. All available DTs
are shown in the following figure.

![Selected DT](dt_selection.png)

Any existing DT asset can be selected and it gets added to
the **Selection** pane on the right. After selecting all the required
assets, you can click on _Proceed_ button to transition to
[DT create stage](../../digital-twins/devops/ui.md)
