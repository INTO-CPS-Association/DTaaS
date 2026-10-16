# Developer Tools

Each directory here supports a different part of developing DTaaS. None
of them ships to users or administrators; the installation packages are
in `deploy/`.

| Directory | Purpose | Use it to |
| :--- | :--- | :--- |
| [`devenv/`](devenv/README.md) | A container with every toolchain the repository needs: Node, Python, Poetry, mkdocs and the linters | Write code, run tests and build the docs without installing the tools on your machine |
| [`check/`](check/README.md) | Dockerfiles that build the DTaaS images from source, and a compose file that runs DTaaS with them. The image workflows in `.github/workflows` build from these Dockerfiles | See whether your changes to the website or the microservices work as an application |
| [`local-server/`](local-server/README.md) | A script that runs the `secure-server_with_integrated-gitlab` package from `deploy/` on one machine under the hostname `intocps.test`, with local TLS certificates | Test an installation package as a server deployment, including OAuth 2.0 sign-in, the GitLab container registry and GitLab runners |

`check/` runs the code in this repository as an application.
`local-server/` runs an installation package the way an administrator
would, using the package's own compose file, so it tests what ships.
