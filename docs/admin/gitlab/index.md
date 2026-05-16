# GitLab Server

DTaaS currently supports local GitLab installation using either:

## Option A: Integrated DTaaS Package

![Integrated GitLab Install](gitlab-integrated-install.png)

See [secure server with GitLab](../dtaas/secure-server-gitlab/install.md).
Continue with [integration guide](integration.md).

## Option B: Services CLI GitLab Workflow

![Services CLI GitLab Install](gitlab-independent-install.png)

Use [services CLI](../services/cli.md) if GitLab is managed
as part of the platform services project.
Continue with [integration guide](integration.md).

## Notes

- DTaaS client auth authority must match the actual GitLab endpoint.
- For integrated package deployments, use the package-local `config/` files.
- For services-cli deployments, use the generated services project files.

## Related

- [Integration guide](integration.md)
- [Runner setup (Linux)](runner-linux.md)
- [Runner setup (Windows)](runner-windows.md)
- [DTaaS integrated package config](../dtaas/secure-server-gitlab/config.md)
- [Workspace secure server config](../workspace/secure-server/configuration.md)
