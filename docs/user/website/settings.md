# Settings

Settings are important both initially when setting up DTaaS and during use when
working with different setups. We have gathered all the most important
configurations on one page for both of these scenarios.

## ⚙️ Changing Settings

You will want to adjust the parameters used for sending and receiving information
to the storage and execution services, e.g. GitLab, so it matches your infrastructure.
Navigate to **Account** using the top-right purple  🅰️ icon and
select the **Settings** tab from there. You will be greeted by the following
changeable parameters:

![Settings Overview](images/settings-overview.png)

1. Group Name
1. DT Directory
1. Common Library Project name
1. Runner Tag
1. Branch Name

Following is a description of what each parameter does.

### Group Name

The Group Name denotes the greatest level of organizational abstraction we
concern ourselves
with on the storage service, namely Groups. You will need to have a
(GitLab or equivalent) group in order to use DTaaS. Within the group, your projects
reside, which must match their usernames of the system users. Read more about
the [file organization](../digital-twins/devops/file-structure.md). This
parameter must be set to the case insensitive name of your group.

**Default**: DTaaS

### Common Library Project name

One project within the group is going to act as the Digital Twins *Library*.
Through DTaaS, the files inside of the Library are accessible to all users and
can be copied to the individual user projects as needed. This parameter tells
DTaaS what the project name of the Library is set to, and so must be that name.

**Default**: common

### DT Directory

Inside of the common library and user projects, the files relating to the Digital
Twins are going to be stored within some folder.
This is the name that you have chosen for that folder.

**Default**: Digital_Twins

### Branch Name

With this parameter, you can choose which branch to look for data in (Twins,
Functions, etc.) within your user and library project. This parameter also decides
which branch's Digital Twins are going to be executed.

**Default**: master

### Runner Tag

The (GitLab) runners, responsible for exercising the Digital Twin code, must be
connected to a tag. Only one tag can be specified and it **cannot** be left blank,
or the job of running the twin won't be picked up. This is a limitation of DTaaS.

**Default**: linux

## 💾 Saving and Resetting your changes

If you are happy with your changes, you must press **SAVE SETTINGS** for them to
persist when you leave the Settings page.
In case you made a mistake, you can easily reset the settings
to their default values by pressing the **RESET TO DEFAULTS** button. The reset
values are saved automatically, so you don't need to save again afterwards. The
Saving and Resetting buttons found on the page:

![Saving and Resetting Settings buttons](images/saving-settings.png)

The default values can be found and changed in the code if needed.

You can now return to the DevOps pages (i.e. Digital Twin Preview). **Refresh to
ensure you have fresh data from the remote repository fetched**, and you should
see your Digital Twins ready to be run, edited and shared.

## 💭 Summary

In this document you have learned how to edit the settings for initializing DTaaS
to your project and for continuous use (i.e. modifying Runner Tag and Branch).
We discussed the need to save your changes and how you can return to default
values if you make a mistake.
