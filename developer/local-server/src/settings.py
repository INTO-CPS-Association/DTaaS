"""Settings shared by the local server test steps."""

from dataclasses import dataclass
from pathlib import Path

# developer/local-server, which holds the template files next to src/
TOOL_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_DIR.parents[1]
PACKAGE_SOURCE = (
    REPO_ROOT / "deploy" / "dtaas" / "docker" / "secure-server_with_integrated-gitlab"
)
USERS = ("user1", "user2")


@dataclass(frozen=True)
class Settings:
    """Hostname, registry port and working directory of one test setup."""

    hostname: str
    registry_port: int
    workdir: Path

    @property
    def package_dir(self) -> Path:
        """Copy of the integrated GitLab package that the test runs."""
        return self.workdir / "integrated-gitlab"

    @property
    def runner_dir(self) -> Path:
        """Directory of the GitLab runner compose project."""
        return self.workdir / "runner"

    @property
    def secrets_dir(self) -> Path:
        """Directory of generated tokens and passwords, readable by the owner."""
        return self.workdir / "secrets"

    @property
    def ca_file(self) -> Path:
        """Copy of the mkcert root CA certificate."""
        return self.workdir / "rootCA.pem"

    @property
    def gitlab_url(self) -> str:
        """URL of the GitLab web interface."""
        return f"https://{self.hostname}/gitlab"

    @property
    def registry(self) -> str:
        """Registry address used by docker login, push and pull."""
        return f"{self.hostname}:{self.registry_port}"
