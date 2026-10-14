# Settings

You need the settings when you first set up the DTaaS and again whenever
you work with a different configuration. The main settings are
collected on one page for both cases.

## Changing Settings

The parameters for sending information to and receiving it from the
storage and execution services (e.g., GitLab) may need to be adjusted
to match your infrastructure.
Click the avatar in the top-right corner, choose **Account**, and open
the **Settings** tab to see the adjustable parameters:

![Settings Overview](images/settings-overview.png)

The settings are in three sections: **Application Settings**,
**Measurement Settings** and **Logging Settings**. Application settings
are used by the DevOps features. Measurement settings are used to
benchmark the DevOps features. Logging settings control the activity log
described on the [Logs](logs.md) page.

Each parameter is described below.

### Application Settings

#### Group Name

The Group Name is the group on the storage service, the highest level
of organisation there. The DTaaS requires a GitLab group. The group
holds projects whose names must match the usernames of system users.
See the [file organisation](../digital-twins/devops/file-structure.md)
for details.
Set this parameter to the name of the group; it is case-insensitive.

**Default**: DTaaS

#### Common Library Project Name

One project in the group is the Digital Twins *Library*.
All users can access the files in the Library through the DTaaS and copy
them to their own projects as needed. This parameter must match the
project name of the Library.

**Default**: common

#### DT Directory

In the common library and in user projects, files related to Digital
Twins are stored in a designated folder.
This parameter is the name of that folder.

**Default**: digital_twins

#### Branch Name

This parameter sets the branch that is searched for data (Twins,
Functions, etc.) in user and library projects. Digital Twins are also
executed from this branch.

**Default**: master

#### Runner Tag

The (GitLab) runners that execute Digital Twin code must have a tag.
Only one tag can be given, and it **cannot** be left blank; otherwise
the job that runs the twin is not processed.
This is a limitation of the DTaaS.

**Default**: linux

### Measurement Settings

#### Trial Number

The number of times each task is repeated during a benchmark run. The
execution times are averaged over the trials. The value must be at
least 1.

**Default**: 3

#### Measurement Secondary Runner Tag

Some benchmark runs require two GitLab runners.
The *Runner Tag* in **Application Settings** points to the first runner,
and the *Measurement Secondary Runner Tag* points to the second runner.

**Default**: windows

#### Primary Digital Twin

Select the first digital twin from the drop-down list of available
digital twins. It is used in the single digital twin and same digital
twin measurement tasks.

**Default**: `hello-world`, or the first digital twin in the list if
`hello-world` is not available

#### Secondary Digital Twin

Select the second digital twin from the drop-down list of available
digital twins. It is used as the second digital twin in the multiple
digital twin measurement tasks. The refresh button next to the list
reloads the available digital twins using the **Branch Name** and
**DT Directory** entered above.

**Default**: `mass-spring-damper`, or the first digital twin in the list
if `mass-spring-damper` is not available

## Logging Settings

### Keep a Local Activity Log

The **Keep a local activity log** checkbox controls whether the DTaaS
records workflow events in your browser (stored locally in IndexedDB).
It is off by default.

If the installation is configured with a remote logger, a second
checkbox, **Send logs to** followed by the name of the logging server,
also sends the events to that server. It is off by default as well.
See [Logs](logs.md) for viewing and downloading logs at
`/insights/log`.

## Saving and Resetting Changes

When you are satisfied with the changes, press **Save Settings** so that
they persist after you leave the Settings page.
To undo a mistake, press **Reset to Defaults** to restore the default
values. The reset values are saved automatically, so you do not need to
save them again. The two buttons are shown below:

![Saving and Resetting Settings buttons](images/saving-settings.png)

The default values are defined in the code and can be changed there if
needed.

You can now return to the DevOps pages (i.e., the Digital Twins Preview
page). When you change the Group Name, Common Library Project Name,
DT Directory or Branch Name, saving fetches the digital twins again from
the remote repository. The Digital Twins should then be visible and
ready to be executed, edited and shared.

## Summary

This page described how to edit the settings, both to initialise the
DTaaS for a project and during continuous use (for example, to change
the Runner Tag or Branch Name). It also covered saving changes and
restoring the default values after a mistake.
