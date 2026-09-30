# End-to-End Fixtures

Files the end-to-end tests upload to the test user's library and remove again,
so a test does not depend on what that library happens to hold.

## `wall-with-opening-and-window.ifc`

A wall with an opening and a window, 12 KB, which the browser converts in a
second or two. The Building Models drawing test uploads it under a name of its
own, converts it, opens it again from the stored geometry, and deletes what it
wrote.

From the buildingSMART Certification datasets, copyright buildingSMART
International Ltd., licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded from
<https://github.com/buildingSMART/Certification-datasets>, directory
`IFC 4.0.2.1 (IFC 4 ADD2 TC1)/ISO Spec - ReferenceView_V1.2/`, under its
original name, and unmodified.
