# User files

This directory contains the source template for user and shared workspaces.
During package generation it is copied into each scenario at `files/`.

- `files/common/` is mounted as `/workspace/common` for all workspace
  containers.
- `files/user1/` and `files/user2/` are mounted as `/workspace` for those users.
- `files/template/` provides a starter folder structure for creating new users.

To add another user in generated packages, copy from `files/template/`
or `files/user1/`.
