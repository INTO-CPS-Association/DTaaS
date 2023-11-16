# File Structure

Inorder to test the lib-MS, a specific file structure must be configured.

Since the tests are tested across two different modes,
'local' or 'gitlab', a homogenous file structure is required.

This file structure must be within 'files' aswell as within
your working gitlab repository, as depicted below...

local file system:

```txt
files/
  user2/
    data/
    digital twins/
    functions/
    models/
    tools/
```

gitlab repository:

```txt
{Your-Gitlab-Group}/
  user2/
    data/
    digital twins/
    functions/
    models/
    tools/
```
