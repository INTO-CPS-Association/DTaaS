# Setting Allowed Values

Some Setting values will cause problems if used. This document provides an
in-depth examination of the values that are allowed and values that are not.
Expected errors and troubleshooting steps
for this page are also covered.

To understand what each parameter does, refer to the [settings](../../website/settings.md)
document.

Note: The user must have the appropriate access rights to all the resources
connected to the application.

## Runner Tag

- <u>Allowed values</u>

This parameter has to be a text string like "linux", "ubuntu", "2" and match some
Runner's tags on the execution service:

![Assigned Runners. One has been assigned the tag of "linux"](images/assigned-project-runners.png)

Multiple values, like "linux, windows" is not supported and will be treated as
one tag.

- <u>Not allowed values</u>

If the **Runner Tag** field *does not* match a Runner, no jobs will be picked up
and the job will hence time out. If the twins unexpectedly time out, verify
that the tag has been spelt correctly.

No tag (i.e. a blank field) is permitted by some services like GitLab,
meaning that *any* Runner that is configured to pick up tag-less jobs can pick
these jobs up. A limitation of DTaaS is that *some* tag is required. No tags, like
other unallowed tags, will be ignored.

- <u>Visual examples</u>

![Allowed and unallowed Runner Tag values](images/runner-settings.png)

## Branch

- <u>Allowed values</u>

The **Branch** field must be a text string matching a branch in the user *and*
common library repositories. For example: "main" or "master":

![Repository showing branch named "main"](images/branch.png)

- <u>Not allowed values</u>

This field should not be left empty or set to a value not matching a branch
in both repositories.
While technically allowed, this may cause errors or unexpected behaviours.

Expected error:
> An error occurred while fetching assets: GitbeakerRequestError: 404 Tree Not Found

- <u>Visual examples</u>

![Allowed and unallowed Branch values](images/branch-settings.png)

## Group name

- <u>Allowed values</u>

The **Group Name** field again requires a text string, and it must further match
some group in the storage service (e.g. GitLab).

Example:
> DTaaS

![GitLab groups. One group named "dtaas"](images/groups.png)

Group names are case insensitive on GitLab, but matching the case
exactly is recommended for consistency and to remove it as a source of error.

- <u>Not allowed values</u>

If the group does not exist or the field is left blank, errors will occur
upon accessing Digital Twins, etc. Ensure that a value is entered.

Expected error:
> An error occurred while fetching assets: GitbeakerRequestError: 404 Group Not
Found

- <u>Visual examples</u>

![Allowed and unallowed Group values](images/group-settings.png)

## Common Library Project name

- <u>Allowed values</u>
The **Common Library Project name** parameter is a text string. It must correlate
to the repository responsible for keeping shared resources.
Examples: "common" and "library":

![Common library repository named "common"](images/common-repository.png)

Failure to match a repository will break the DevOps page.

Expected error:
> An error occurred while fetching assets: Error: Common project not found

- <u>Not allowed values</u>

This field should not be left blank or set to a value not matching a
repository. It is inadvisable for it to match a user repository.

- <u>Visual examples</u>

![Allowed and unallowed Common values](images/common-settings.png)

## DT directory

- <u>Allowed values</u>

Like the other fields, this must be a text string. It should match the name of
the folder within the common library and most importantly the user repository
where the Digital Twins are stored.

![Common repository overview highlighting the digital_twins folder.](images/digital_twins-folder.png)

- <u>Not allowed values</u>

Do not leave this blank or erroneously mapped. This will lead to silent failure
with the Digital Twins not loading or Digital Twins from a previous set up to
show up.

![Allowed and unallowed DT directory values](images/DT-directory-settings.png)

## 🧯 Troubleshooting

The Digital Twins are not showing up:
> Verify that Group, Branch, common and DT directory all are configured exactly.
like it is on the backend.

The Digital Twins are timing out:
> Verify that the Runner Tag parameter is not a list of tags, that the runner is
active and matches its tag.

## 💭 Summary

The possible values for correctly connecting DTaaS
to the relevant storage and service instances have been specified, along with
potential pitfalls. The key point is not to
leave any of the fields blank; they should be of the text string format and
properly correspond to the relevant services and runners. Some troubleshooting steps
have further been provided to overcome common hurdles.
