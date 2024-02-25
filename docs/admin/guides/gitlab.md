# Install Gitlab

This guide helps with installation of a dedicated
[Gitlab](https://gitlab.com) service. This Gitlab installation can be used
as OAuth2 authorization provider to the DTaaS software.

There are two possible ways you can install Gitlab:

* At dedicated domain name (ex: <http:>_gitlab.foo.com_</http:>)
* At a URL path on existing WWW server (ex: <http:>foo.com/gitlab</http>)

This guide illustrates the installation of Gitlab at:
<http:>foo.com/gitlab</http>. But the instructions can be
adapted to install Gitlab at a dedicated domain name.

## Configure and Install

If you have not cloned the DTaaS git repository, cloning would be
the first step.
In case you already have the codebase, you can skip the cloning step.
To clone, do:

```bash
git clone https://github.com/into-cps-association/DTaaS.git
cd DTaaS/deploy/services
```

The next step in installation is to specify the config for the Gitlab.
The __gitlab.yml__ contains the required configuration settings.
Update the configuration file before proceeding with the installation.

Now continue with the installation of services.

```bash
yarn install
node gitlab.js
```

### Post-install Configuration

Gitlab also requires post-installation configuration.

!!! Information
    <!-- markdownlint-disable-file MD013 -->
    This configuration needs to be done from within the running container.

```bash
docker exec -it gitlab bash
```

The configuration file to change is _/etc/gitlab/gitlab.rb_.
The variables to change are:

```ini
external_url 'http(s)://foo.com/gitlab'
nginx['listen_port'] = 80
nginx['enable'] = true

nginx['listen_https'] = false
nginx['redirect_http_to_https'] = false
letsencrypt['enable'] = false
```

If you want to use <http:>_gitlab.foo.com_</http:> for Gitlab installation,
you can make one change:
`external_url http(s)://foo.com/gitlab`. Other settings remain the same.

```bash
gitlab-ctl reconfigure
```

The administrator username for Gitlab is: `root`. The password for
this user account is available in: `/etc/gitlab/initial_root_password`.

### Traefik Gateway Configuration

It is likely that you are going to put the Gitlab behind Traefik gateway.
If so, do remove the middleware authorization from gitlab PathPrefix.

## Use

After the installation is complete, the required user accounts and OAuth2
applications can be setup on this Gitlab instance.
