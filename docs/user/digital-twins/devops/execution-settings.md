# Setting Allowed Values

Some setting values cause problems. This page lists the values that
are allowed and those that are not, with the errors to expect and
troubleshooting steps.

The settings are on the **Settings** tab of the **Account** page.
The [settings](../../website/settings.md) page explains what each
parameter does.

Note: the user must have access rights to all the resources
connected to the application.

The Settings form rejects an empty value in any of these fields and
shows a "... is required" message under the field.

## Runner Tag

- <u>Allowed values</u>

This parameter is a text string such as "linux", "ubuntu" or "2", and it
must match a tag of a runner on the execution service:

![Assigned Runners. One has been assigned the tag of "linux"](images/assigned-project-runners.png)

Multiple values, such as "linux, windows", are not supported and are
treated as one tag.

- <u>Not allowed values</u>

If the **Runner Tag** field *does not* match a runner, no runner picks up
the job and it times out. If the twins time out unexpectedly, check
the spelling of the tag.

Some services, such as GitLab, allow jobs without a tag, which *any*
runner configured to pick up untagged jobs can run. The DTaaS requires
a tag, so the field cannot be left blank.

- <u>Visual examples</u>

![Allowed and unallowed Runner Tag values](images/runner-settings.png)

## Branch Name

- <u>Allowed values</u>

The **Branch Name** field must be a text string matching a branch in the
user *and* common library repositories. For example: "main" or "master":

![Repository showing branch named "main"](images/branch.png)

- <u>Not allowed values</u>

The field cannot be left empty. Do not set it to a value that does not
match a branch in both repositories: the form accepts such a value, but
it causes errors or unexpected behaviour.

Expected error:
> An error occurred while fetching assets: GitbeakerRequestError: 404 Tree Not Found

- <u>Visual examples</u>

![Allowed and unallowed Branch values](images/branch-settings.png)

## Group name

- <u>Allowed values</u>

The **Group Name** field is a text string that must match a group in the
storage service (for example, GitLab).

Example:
> DTaaS

![GitLab groups. One group named "dtaas"](images/groups.png)

Group names are case insensitive on GitLab, but matching the case
exactly is recommended for consistency and to rule it out as a source
of error.

- <u>Not allowed values</u>

If the group does not exist, errors occur when digital twins and other
assets are loaded.

Expected error:
> An error occurred while fetching assets: GitbeakerRequestError: 404 Group Not
Found

- <u>Visual examples</u>

![Allowed and unallowed Group values](images/group-settings.png)

## Common Library Project name

- <u>Allowed values</u>

The **Common Library Project Name** parameter is a text string. It must
match the repository that holds the shared resources.
Examples: "common" and "library":

![Common library repository named "common"](images/common-repository.png)

If it does not match a repository, the Digital Twins Page and the
Library Page cannot load their assets.

Expected error:
> An error occurred while fetching assets: Error: Common project
`<name>` not found

- <u>Not allowed values</u>

Do not set this field to a value that does not match a repository.
It should not match a user repository either.

- <u>Visual examples</u>

![Allowed and unallowed Common values](images/common-settings.png)

## DT directory

- <u>Allowed values</u>

This is also a text string. It must match the name of the folder in
the common library and, above all, in the user repository where the
digital twins are stored.

![Common repository overview highlighting the digital_twins folder.](images/digital_twins-folder.png)

- <u>Not allowed values</u>

Do not set this to a folder that does not exist. It fails silently:
the digital twins do not load, or digital twins from a previous setup
show up.

![Allowed and unallowed DT directory values](images/DT-directory-settings.png)

## Troubleshooting

The digital twins are not showing up:
> Check that Group Name, Branch Name, Common Library Project Name and
DT Directory match the backend exactly.

The digital twins are timing out:
> Check that the Runner Tag is a single tag, not a list, and that a
runner with that tag is active.

## Summary

Every field must be a text string that matches the corresponding
repository, group, branch or runner tag on the backend. The
troubleshooting steps above cover the most common problems.
