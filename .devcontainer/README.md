# DTaaS DevContainer

This directory holds the VS Code entry point to the DTaaS development
environment. It does not define the environment itself.

The image and its services live in `developer/devenv/`, so VS Code users
and plain Docker users run the same toolchain. See
[developer/devenv/README.md](../developer/devenv/README.md) for what is
installed and how to use it outside VS Code.

## Use

Open the repository in VS Code and choose **Reopen in Container**.
`initializeCommand` runs `developer/devenv/init.sh` on the host first,
which writes `developer/devenv/.env` so the container user matches your
host account. On Windows, VS Code runs the command under `cmd.exe`,
which has no `sh`; the command then falls back to
`developer/devenv/init.cmd`, which writes a fixed `UID=1000` and
`GID=1000` because Docker Desktop does not map host ids onto bind
mounts.

`workspace-settings.json` is copied to `.vscode/settings.json` after the
container is created.
