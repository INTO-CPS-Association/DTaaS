# DTaaS DevContainer

This directory holds the VS Code entry point to the DTaaS development
environment. It does not define the environment itself.

The image and its services live in `developer/devenv/`, so VS Code users
and plain Docker users run the same toolchain. See
[developer/devenv/README.md](../developer/devenv/README.md) for what is
installed and how to use it outside VS Code.

## Use

Generate the identity file once, so the container user matches your host
account:

```sh
cd developer/devenv
printf 'UID=%s\nGID=%s\n' "$(id -u)" "$(id -g)" > .env
```

Then open the repository in VS Code and choose **Reopen in Container**.

`workspace-settings.json` is copied to `.vscode/settings.json` after the
container is created.
