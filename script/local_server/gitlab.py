"""Minimal GitLab REST API client for the local server test."""

import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

from shell import run

ROOT_TOKEN_RUBY = (
    'u = User.find_by_username("root"); '
    't = u.personal_access_tokens.create!(name: "local-server-test", '
    "scopes: [:api], expires_at: 7.days.from_now); puts t.token"
)


def http_status(url, ca_file):
    """Return the HTTP status of a GET request, or 0 if nothing answers."""
    context = ssl.create_default_context(cafile=str(ca_file))
    try:
        with urllib.request.urlopen(url, context=context, timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except (urllib.error.URLError, OSError):
        return 0


def wait_for(checks, ca_file, timeout=1200, interval=10):
    """Wait until every (url, status) pair in checks answers with its status."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if all(http_status(url, ca_file) == status for url, status in checks):
            return
        time.sleep(interval)
    raise TimeoutError(f"No expected answer from {[url for url, _ in checks]}")


def create_root_token():
    """Create a personal access token for root inside the GitLab container."""
    output = run(["docker", "exec", "gitlab", "gitlab-rails", "runner",
                  ROOT_TOKEN_RUBY], capture=True)
    return output.splitlines()[-1]


class GitLab:
    """Calls the GitLab REST API with a personal access token."""

    def __init__(self, base_url, token, ca_file):
        self.api = f"{base_url}/api/v4"
        self.token = token
        self.context = ssl.create_default_context(cafile=str(ca_file))

    def request(self, method, path, data=None):
        """Send one API request and return the decoded JSON answer."""
        body = json.dumps(data).encode() if data is not None else None
        request = urllib.request.Request(
            f"{self.api}/{path}", data=body, method=method,
            headers={"PRIVATE-TOKEN": self.token,
                     "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, context=self.context) as response:
            text = response.read().decode()
        return json.loads(text) if text else None

    def find(self, path):
        """Return the object at path, or None if GitLab answers 404."""
        try:
            return self.request("GET", path)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            raise

    def ensure_group(self, name):
        """Return the group called name, creating it if needed."""
        group = self.find(f"groups/{name}")
        return group or self.request("POST", "groups", {"name": name, "path": name})

    def ensure_project(self, group, name):
        """Return the project group/name, creating it if needed."""
        full_path = quote(group["path"] + "/" + name)
        project = self.find(f"projects/{full_path}")
        return project or self.request(
            "POST", "projects",
            {"name": name, "path": name, "namespace_id": group["id"]},
        )

    def ensure_user(self, username, email, password):
        """Create a confirmed user unless the username exists already."""
        if self.request("GET", f"users?username={username}"):
            return False
        self.request("POST", "users", {
            "username": username, "name": username, "email": email,
            "password": password, "skip_confirmation": True,
        })
        return True


def quote(value):
    """Encode a path such as group/project for use in an API URL."""
    return urllib.parse.quote(value, safe="")
