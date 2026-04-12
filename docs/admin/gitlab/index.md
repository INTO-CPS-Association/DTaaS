# GitLab Server

DTaaS currently supports local GitLab installation using either:

1. `deploy/dtaas/docker/secure-server_with_integrated-gitlab`
2. `deploy/services/cli` GitLab workflow

## Option A: Integrated DTaaS Package

Use `deploy/dtaas/docker/secure-server_with_integrated-gitlab` when GitLab
should run behind Traefik at `https://<SERVER_DNS>/gitlab`.

1. Create runtime config files from examples.
2. Start package services:

   ```bash
   cd deploy/dtaas/docker/secure-server_with_integrated-gitlab
   docker compose --env-file config/.env up -d
   ```

3. Wait for GitLab health to become `healthy`.
4. Retrieve root password from `config/gitlab/initial_root_password`.
5. Continue with [integration guide](integration.md).

## Option B: Services CLI GitLab Workflow

Use `deploy/services/cli` if GitLab is managed as part of the platform
services project.

1. Generate/open a services project.
2. Configure `config/services.env`.
3. Install GitLab using CLI:

   ```bash
   dtaas-services install -s gitlab
   ```

4. Continue with [integration guide](integration.md).

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
