# GitLab Server

DTaaS supports two ways of installing a local GitLab instance.

## Option A: Integrated DTaaS Package

![Integrated GitLab Install](gitlab-integrated-install.png)

See [secure server with GitLab](../dtaas/secure-server-gitlab/install.md),
then continue with the [integration guide](integration.md).

## Option B: Services CLI GitLab Workflow

![Services CLI GitLab Install](gitlab-independent-install.png)

Use the [services CLI](../services/cli.md) if GitLab runs as one of the
platform services, then continue with the
[integration guide](integration.md).

## Notes

- The DTaaS client auth authority must match the actual GitLab endpoint.
- For integrated package deployments, use the package's own `config/` files.
- For services CLI deployments, use the files of the generated services
  project.

## Related

- [Integration guide](integration.md)
- [Runner setup (Linux)](runner-linux.md)
- [Runner setup (Windows)](runner-windows.md)
- [DTaaS integrated package config](../dtaas/secure-server-gitlab/config.md)
- [Workspace secure server config](../workspace/secure-server/configuration.md)
