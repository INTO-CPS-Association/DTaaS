"""README rendering helpers for build-packages."""

from __future__ import annotations

from textwrap import dedent

from .models import Scenario

BASH_BLOCK = "```bash"


def _localhost_env_table() -> str:
    return dedent(
        """
        | Variable | Example value | Description |
        | :--- | :--- | :--- |
        | `USERNAME1` | `user1` | Username for the single workspace and URL prefix (`/user1`). |
        """
    ).strip()


def _server_env_table() -> str:
    return dedent(
        """
        | Variable | Example value | Description |
        | :--- | :--- | :--- |
        | `SERVER_DNS` | `foo.com` | Public DNS or IP used by Traefik routes. |
        | `OAUTH_URL` | `https://gitlab.foo.com` | OAuth provider base URL. |
        | `OAUTH_CLIENT_ID` | `xx` | Client ID for Traefik forward-auth OAuth app. |
        | `OAUTH_CLIENT_SECRET` | `xx` | Client secret for Traefik forward-auth OAuth app. |
        | `OAUTH_SECRET` | `random-secret-string` | Private random session signing string. |
        | `USERNAME1` | `user1` | First DTaaS user workspace name and URL prefix. |
        | `USERNAME2` | `user2` | Second DTaaS user workspace name and URL prefix. |
        """
    ).strip()


def _localhost_intro(secure: bool) -> list[str]:
    image_name = "localhost-https.png" if secure else "localhost.png"
    protocol = "HTTPS" if secure else "HTTP"
    return [
        f"# DTaaS {'secure ' if secure else ''}localhost package",
        "",
        f"This package runs DTaaS for a single user on localhost over {protocol}.",
        "It intentionally does **not** include Traefik forward-auth.",
        "",
        f"![Deployment diagram](./{image_name})",
    ]


def _localhost_included_files() -> list[str]:
    return [
        "## Included files",
        "",
        "- `docker-compose.yml`",
        "- `.env.example`",
        "- `config/` (includes sample client and traefik config)",
        "- `files/`",
        "- `LICENSE.md`",
    ]


def _localhost_configuration(secure: bool) -> list[str]:
    lines = [
        "## Configuration",
        "",
        "1. Copy `.env.example` to `.env`.",
        "2. Update values in `.env`.",
    ]
    if secure:
        lines.extend(
            [
                "3. Place certificates at `certs/fullchain.pem` and `certs/privkey.pem`.",
                "4. If paths differ, update `config/traefik/tls.yml`.",
            ]
        )
    return lines


def _localhost_environment_section() -> list[str]:
    return [
        "Environment variables:",
        "",
        *_localhost_env_table().splitlines(),
        "",
        "If you change `USERNAME1`, create the matching workspace folder:",
        "",
        BASH_BLOCK,
        "cp -R files/user1 files/<your-username>",
        "```",
    ]


def _run_stop_section() -> list[str]:
    return [
        "## Run",
        "",
        BASH_BLOCK,
        "docker compose up -d",
        "```",
        "",
        "## Stop",
        "",
        BASH_BLOCK,
        "docker compose down",
        "```",
    ]


def _localhost_readme(secure: bool) -> str:
    lines = _localhost_intro(secure)
    lines.extend(
        ["", *_localhost_included_files(), "", *_localhost_configuration(secure)]
    )
    lines.extend(["", *_localhost_environment_section(), "", *_run_stop_section()])
    return "\n".join(lines)


def _server_intro(secure: bool) -> list[str]:
    protocol = "HTTPS" if secure else "HTTP"
    return [
        f"# DTaaS {'secure ' if secure else ''}server package",
        "",
        f"This package runs DTaaS for multiple users over {protocol} with OAuth",
        "authorization enforced by Traefik forward-auth.",
        "",
        "![Deployment diagram](./server.png)",
    ]


def _server_included_files() -> list[str]:
    return [
        "## Included files",
        "",
        "- `docker-compose.yml`",
        "- `.env.example`",
        "- `config/` (includes client, traefik, forward-auth, and libms samples)",
        "- `files/`",
        "- `LICENSE.md`",
    ]


def _server_configuration(secure: bool) -> list[str]:
    lines = [
        "## Configuration",
        "",
        "1. Copy `.env.example` to `.env`.",
        "2. Update values in `.env`.",
        "",
        *_server_env_table().splitlines(),
        "",
        "3. Update `config/client/env.server.js` with your deployment URL.",
        "4. Update `config/forward-auth/conf.server` with allowed user e-mails.",
    ]
    if secure:
        lines.append(
            "5. Place certificates at `certs/fullchain.pem` and `certs/privkey.pem`."
        )
    return lines


def _server_readme(secure: bool) -> str:
    lines = _server_intro(secure)
    lines.extend(["", *_server_included_files(), "", *_server_configuration(secure)])
    lines.extend(["", *_run_stop_section()])
    return "\n".join(lines)


def package_readme(scenario: Scenario) -> str:
    if scenario.server:
        return _server_readme(scenario.secure)
    return _localhost_readme(scenario.secure)
