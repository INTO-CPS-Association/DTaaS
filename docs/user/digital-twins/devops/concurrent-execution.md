# Running Multiple Digital Twins at the Same Time

The DTaaS platform can execute several digital twins at once. This saves
time with long-running digital twins or when they run on different
resources.

## Running Digital Twins

To run a digital twin, open the **Execute** tab of the
**Digital Twins Page**. Click **Automation** in the menu on the left,
then click the **Digital Twins Page** card. The page opens in the
same browser tab.

The **Execute** tab shows a card for each digital twin, with its name,
a short description and the **Start** and **History** buttons.
**Start** sends a *job* to the backend, which runs the simulation
defined by the digital twin's [lifecycle files](../lifecycle.md).
You can inspect and change these files with the **Reconfigure** button
on the **Manage** tab.

### Running Multiple Twins

Pressing **Start** several times queues several simulations.
You can also queue different digital twins.

![Digital Twin cards](./images/concurrent-execution.png)

The deployment service (for example, GitLab) balances the load across the
available runners, so it can be configured once and then left to run.

## The Execution Log

**History** opens a list of all current and past runs, showing the time
of execution and the status (Running, Completed, Failed, Canceled or
Timed out). To review the results of a run, click an entry (or the arrow
on the right of the entry) to expand it. The log of each job in the
pipeline is then shown.

To delete an entry, click the trash icon and confirm the deletion in the
dialog. The **Clear All** button deletes all entries of a digital twin.

Click the stop icon of a running entry to stop that execution:

![Stop Execution](images/stop-execution.png)

## Changing Runners

The runners that pick up jobs can be changed in the settings.
See [these and other settings](../../website/settings.md).

## Summary

This page described the **Execute** tab: running several digital twins
at once, and inspecting and deleting their logs.
