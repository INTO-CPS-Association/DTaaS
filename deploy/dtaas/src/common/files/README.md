# User files

This directory contains the source template for user and shared workspaces.
During package generation it is copied into each scenario at `files/`.

- `files/common/` is mounted as `/workspace/common` for all workspace
  containers.
- `files/user1/` is mounted as `/workspace` in localhost packages.
- `files/user1/` and `files/user2/` are mounted as `/workspace` in server packages.
- `files/template/` provides a starter folder structure for creating new users in
  server packages.

For localhost packages, create additional user folders by copying `files/user1/`.
For server packages, copy from `files/template/` or `files/user1/`.
