# Digital Twins and DevOps

[DevOps](https://en.wikipedia.org/wiki/DevOps) has been
a well established software development practice.
We are bringing out an experimental feature of integration DevOps
in the DTaaS.

This feature requires specific installation setup.

1. [Integrated GitLab installation](../../../admin/gitlab/integration.md)
1. A valid GitLab repository for the logged in user. Please see
   an [example repository](https://gitlab.com/dtaas/user1). You can clone
   this repository and customize to your needs.
1. [A linked GitLab Runner](../../../admin/gitlab/runner.md)
   to the user gitlab repository.

## DT Lifecycle

The DT preview implements the **Create**, **Manage** and **Execute**
stages of a [DT lifecycle](../lifecycle.md). The suggested sequence
of use for different lifecycle stages are:

![Suggested sequence of lifecycle stages](images/devops-lifecycle.png).

There are dedicated
tabs for **Create**, **Manage** and **Execute** stages.
The selection of DT assets for Create stage happens via
[Library preview page](../../library/devops/ui.md).
The Manage tab fulfills reconfigure feature. The Execute and
Terminate are managed on the Execute tab.

## Create Tab

The users select reusable DT assets and arrive on the Create tab.
The following figure shows DT creation page after selecting
_mass-spring-damper_ as a reusable asset for the new DT.

![New DT creation](images/dt-create-empty.png)

The left-side menu shows the possibility of creating
[necessary structure](../../digital-twins/devops/file-structure.md)
and elements for a new DT. Each reusable asset selected for this new DT
appears on the left menu. Its configuration can be updated as well.

These files on the left menu correspond to three categories.

* **Description**: contains _README.md_ providing comprehensive
  description of DT and _description.md_ providing a brief
  description. The brief description is shown in the DT tabs and
  clicking on the _Details_ button shows the complete README.md
  The _Details_ button is available only on the Manage page.
* **Configuration**: Contains a _.gitlab-ci.yaml_ for running
  the required lifecycle scripts and operations of the DT.
  Additional json and yaml files can be added to create configuration
  for a new DT.
* **Lifecycle**: These are the DT lifecycle scripts.

The _Add New File_ button can be used to add new files in all the three
categories. Finally, click on _SAVE_ button to save the new DT.
Newly created DTs become immediately available on the **Manage** and
**Execute** tabs.

## Manage Tab

![Manage Digital Twin Preview Page](images/dt_manage.png)

The manage tab allows for different operations on a digital twin:

* Checking the details (**Details** button)
* Delete (**Delete** button)
* Modify / Reconfigure (**Reconfigure** button)

A digital twin placed in the DTaaS has a certain recommended
structure. Please see the
[assets pag](../../servers/lib/assets.md) for an explanation
and
[this example](https://github.com/INTO-CPS-Association/DTaaS-examples/tree/main/digital_twins/mass-spring-damper).

The information page shown using the Details button, shows
the README.md information stored inside the digital twin directory.

![Digital Twin Details](images/dt_manage_details.png)

A reconfigure button opens an editor and shows all the files corresponding
to a digital twin. All of these files can be updated. These files
correspond to three categories.

* **Description**
* **Configuration**
* **Lifecycle**

![Digital Twin Reconfigure](images/dt_manage_reconfigure.png)

## Execute Tab

![Digital Twin Execute](images/concurrent-execution.png)

The execute tabs shows the possibility of executing multiple digital twins.
Once an execution of digital twin is complete, you can see the execution
log as well.

![Digital Twin Execution Log](images/dt_execute_log.png)
