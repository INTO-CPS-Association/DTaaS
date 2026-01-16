# Running Multiple Digital Twins at the Same Time

The DTaaS platform allows for executing multiple Digital Twins in tandem with
one another. This can save hours of time when dealing with intensive Digital Twins
or when you want to deploy them across different resources.

## ⏯️ Running Digital Twins

When you want to deploy a Digital Twin you can do this from the *Execution tab*
on the *Digital Twin Preview page*. You can find this by clicking on the Workbench
icon ![icon](images/developer-icon.png) in the sidebar on the left hand side and
locating *Digital Twins Preview* among the other links. Click to open the *Digital
Twin Preview page* in a new tab.

In the newly opened tab you will see a series of cards with a name, short
description of the Digital Twins and **START** and **HISTORY** buttons.
The **START** button sends a *job* to the backend, telling it to run the simulation
associated with that Digital Twin, which is defined by its [Life Cycle files](../lifecycle.md).
You can inspect and change these in the *Edit* tab.

### Running Multiple Twins

Pressing the **START** button multiple times queues multiple simulations. You can
also queue different kinds of Digital Twins.

![Digital Twin cards](./images/concurrent-execution.png)

The deployment service (e.g. GitLab)  automatically load balances across available
runners, so you can set it and forget it.

## 🗃️ The Execution Log

Pushing the **HISTORY** button provides an overview of all current and past
simulation trials, distinguished by time of execution and status (Running,
Failed, Succeeded or Timed Out). To check how a simulation went, you can click
on an entry (or the arrow on the right of the entry) to expand it. Each step in
the Life Cycle will then be presented.

If you want to delete an entry, click the trash icon. A verification box will
reassure you that you are deleting the right one. You can also delete all entries
of a Digital Twin with the **CLEAR ALL** button.

Click the stop symbol in the log to stop an execution:

![Stop Execution](images/stop-execution.png)

## 🔧 Changing Runners

You can change which runners pick up the jobs in the settings. Read more about
[this and other settings](../../website/settings.md) that are available.

## 💭 Summary

You have now learned how to navigate the DevOps Execution page: execute multiple
Digital Twins at the same time and inspect and delete their logs.
