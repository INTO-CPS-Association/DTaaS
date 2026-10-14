# Digital Twins and DevOps

[DevOps](https://en.wikipedia.org/wiki/DevOps) is a well-established
software development practice. The DTaaS has an experimental feature
that brings DevOps to digital twins.

Recordings of the latest workflows:

- [DTaaS DevOps workflows](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20250712-DTaaS_DevOps_workflows.mov)
- [Automation layer demo](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/20260417_Automation-Layer-Demo.mp4)

This feature requires a specific installation setup:

1. [Integrated GitLab installation](../../../admin/gitlab/integration.md)
1. A valid GitLab repository for the logged-in user. See
   an [example repository](https://gitlab.com/dtaas/user1). You can
   clone this repository and customise it as needed.
1. [A GitLab Runner](../../../admin/gitlab/runner-linux.md) linked
   to the user's GitLab repository.

To open the feature, click **Automation** in the menu and then the
**Digital Twins Page** card.

## DT Lifecycle

The **Digital Twins Page** implements the **Create**, **Manage** and
**Execute** stages of a [DT lifecycle](../lifecycle.md). The suggested
order of the lifecycle stages is:

![Suggested sequence of lifecycle stages](../../../developer/system/research-overview/lifecycle-phases.png#only-light)
![Suggested sequence of lifecycle stages](../../../developer/system/research-overview/lifecycle-phases-dark.png#only-dark)

Each of the **Create**, **Manage** and **Execute** stages has its own tab.
The DT assets for the Create stage are selected on the
[Library Page](../../library/devops/ui.md).
The Manage tab reconfigures digital twins. Execution and termination
happen on the Execute tab.

## Create Tab

Users select reusable DT assets on the Library Page and then arrive on
the Create tab. The following figure shows the Create tab after
_mass-spring-damper_ was selected as a reusable asset for the new DT.

![New DT creation](images/dt-create-empty.png)

The menu on the left lets you create the
[necessary structure](../../digital-twins/devops/file-structure.md)
and elements of a new DT. Each reusable asset selected for the new DT
appears in this menu, and its configuration can be updated.

The files in the left menu fall into three categories.

- **Description**: contains _README.md_, a full description of the DT,
  and _description.md_, a brief description. The brief description is
  shown on the DT cards. The _Details_ button on the Manage tab shows
  the complete README.md.
- **Configuration**: contains a _.gitlab-ci.yml_ for running
  the lifecycle scripts and other operations of the DT.
  You can add more JSON and YAML files to configure the new DT.
- **Lifecycle**: the DT lifecycle scripts.

The _Add New File_ button adds new files in any of the three
categories. Click the _Save_ button to save the new DT.
Newly created DTs appear on the **Manage** and **Execute** tabs
straight away.

## Manage Tab

![Manage Digital Twin Preview Page](images/dt_manage.png)

The Manage tab offers these operations on a digital twin:

- Check the details (**Details** button)
- Delete (**Delete** button)
- Modify or reconfigure (**Reconfigure** button)

A digital twin placed in the DTaaS has a recommended
structure. See the
[assets page](../../servers/lib/assets.md) for an explanation
and
[this example](https://github.com/INTO-CPS-Association/DTaaS-examples/tree/main/digital_twins/mass-spring-damper).

The Details button shows the README.md stored in the digital twin
directory.

![Digital Twin Details](images/dt_manage_details.png)

The Reconfigure button opens an editor with all the files of
a digital twin, and all of them can be updated. The files fall into
the same three categories.

- **Description**
- **Configuration**
- **Lifecycle**

![Digital Twin Reconfigure](images/dt_manage_reconfigure.png)

## Execute Tab

![Digital Twin Execute](images/concurrent-execution.png)

The Execute tab can run several digital twins at once.
When an execution of a digital twin finishes, its execution
log is available.

![Digital Twin Execution Log](images/dt_execute_log.png)
