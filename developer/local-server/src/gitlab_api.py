"""Minimal GitLab REST API client for the local server test."""

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request

from shell import run, wait_until

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
    """Wait until every (url, status) pair in checks answers with its status.

    The timeout message lists the last answers; status 0 means no answer
    or a TLS failure, such as an untrusted certificate.
    """
    last = {}

    def all_ready():
        """Record each URL's answer and tell whether all are as expected."""
        last.update({url: http_status(url, ca_file) for url, _ in checks})
        return all(last[url] == status for url, status in checks)
    try:
        wait_until(all_ready, timeout, interval, "GitLab and the registry")
    except TimeoutError as error:
        raise TimeoutError(f"{error}; last answers: {last}") from error


def create_root_token():
    """Create a personal access token for root inside the GitLab container."""
    output = run(["docker", "exec", "gitlab", "gitlab-rails", "runner",
                  ROOT_TOKEN_RUBY], capture=True)
    if not output:
        raise RuntimeError("GitLab returned no access token for root")
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

    def find_user(self, username):
        """Return the user called username, or None."""
        users = self.request("GET", f"users?username={username}")
        return users[0] if users else None

    def create_user(self, username, email, password):
        """Create a confirmed user and return it."""
        return self.request("POST", "users", {
            "username": username, "name": username, "email": email,
            "password": password, "skip_confirmation": True,
        })


def quote(value):
    """Encode a path such as group/project for use in an API URL."""
    return urllib.parse.quote(value, safe="")
