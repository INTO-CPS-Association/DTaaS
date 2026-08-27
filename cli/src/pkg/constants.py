import re

# For users.py / deploy.py
COMPOSE_USERS_YML = "compose.users.yml"

# For registry.py
REGISTRY_FILE = "dtaas.users.registry.json"
DESIRED_STATUSES = frozenset({"running", "paused", "stopped"})

# For state.py
STATE_FILE = ".dtaas.state.json"

# For pkg/users.py: GitLab provisioning token storage
GITLAB_USER_TOKENS_FILE = "gitlab_user_tokens.json"

# For utils.py
LOCALHOST_SERVER = "localhost"

# A safe username: alphanumeric plus . _ - only, so it never carries shell
# metacharacters, whitespace, or path separators into container commands.
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

# For pkg/validators.py
URL_RE = re.compile(r"^https?://[A-Za-z0-9.-]+(:\d+)?(/[A-Za-z0-9._~%/+-]*)?$")
SIZE_RE = re.compile(r"^\d+(\.\d+)?\s*([kmgt]i?b?|b)$", re.IGNORECASE)
NUMERIC_HOST_RE = re.compile(r"^[0-9.]+$")

# For users_utils.py: rule.onlyu<N>. prefixes in config/conf.server.
CONF_SERVER_RULE_NUM_RE = re.compile(r"rule\.onlyu(\d+)\.")

# For deploy_config.py: username<N>/email<N> pseudo-keys under [users].
USER_PSEUDO_KEY_RE = re.compile(r"(username|email)(\d+)$")

# Credential-bearing files. These must never reach the packaged wheel
# (build.py) and are chmod'd 0600 wherever the CLI writes them (project.py,
# deploy_config.py): dtaas.toml can carry the GitLab provisioning PAT,
# users.csv an optional plaintext password column, and gitlab_user_tokens.json
# the PATs issued to provisioned users.
SECRET_FILENAMES = frozenset(
    {
        ".env",
        "conf.server",
        "client.js",
        "forward-auth-conf",
        "dtaas.toml",
        "users.csv",
        GITLAB_USER_TOKENS_FILE,
    }
)
SECRET_SUFFIXES = (".pem", ".key", ".crt", ".p12")
