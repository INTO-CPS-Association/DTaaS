"""Template placeholder constants used by deploy_config."""

_BINARY_EXTENSIONS = frozenset(
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".ico",
        ".pdf",
        ".gz",
        ".zip",
        ".tar",
        ".bin",
    }
)

_REACT_AUTH_FMT = "REACT_APP_AUTH_AUTHORITY: '{}'"

_DEPLOY_CREDS = {
    "localhost": [
        ("default-user", "DEFAULT_USER=user1", "DEFAULT_USER={}"),
        (
            "auth-authority",
            "REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com/'",
            _REACT_AUTH_FMT,
        ),
    ],
    "insecure-server": [
        ("oauth-url", "OAUTH_URL=https://gitlab.com", "OAUTH_URL={}"),
        ("oauth-client-id", "your_client_id_here", "{}"),
        ("oauth-client-secret", "your_client_secret_here", "{}"),
        ("oauth-secret", "your_random_secret_key_here", "{}"),
        (
            "auth-authority",
            "REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com'",
            _REACT_AUTH_FMT,
        ),
    ],
    "secure-server": [
        ("oauth-url", "OAUTH_URL=https://gitlab.com", "OAUTH_URL={}"),
        ("oauth-client-id", "your_client_id_here", "{}"),
        ("oauth-client-secret", "your_client_secret_here", "{}"),
        ("oauth-secret", "your_random_secret_key_here", "{}"),
        (
            "auth-authority",
            "REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com'",
            _REACT_AUTH_FMT,
        ),
    ],
    "secure-server-gitlab": [
        ("oauth-client-id", "your_client_id_here", "{}"),
        ("oauth-client-secret", "your_client_secret_here", "{}"),
        ("oauth-secret", "your_random_secret_key_here", "{}"),
    ],
    "workspace-localhost": [
        ("default-user", "DEFAULT_USER=user", "DEFAULT_USER={}"),
        ("client-id", "id: mock", "id: {}"),
        ("client-id", "REACT_APP_CLIENT_ID: 'mock'", "REACT_APP_CLIENT_ID: '{}'"),
        (
            "auth-authority",
            "REACT_APP_AUTH_AUTHORITY: 'http://localhost:5556/dex'",
            _REACT_AUTH_FMT,
        ),
        ("auth-authority", "issuer: http://localhost:5556/dex", "issuer: {}"),
    ],
    "workspace-secure-server": [
        ("oauth-secret", "your_random_secret_key_here", "{}"),
        ("keycloak-admin", "KEYCLOAK_ADMIN=admin", "KEYCLOAK_ADMIN={}"),
        (
            "keycloak-admin-password",
            "KEYCLOAK_ADMIN_PASSWORD=changeme",  # NOSONAR
            "KEYCLOAK_ADMIN_PASSWORD={}",
        ),
        ("keycloak-realm", "KEYCLOAK_REALM=dtaas", "KEYCLOAK_REALM={}"),
        ("keycloak-issuer-url", "https://intocps.org/auth/realms/dtaas", "{}"),
        (
            "keycloak-client-id",
            "KEYCLOAK_CLIENT_ID=dtaas-workspace",
            "KEYCLOAK_CLIENT_ID={}",
        ),
        ("keycloak-client-secret", "your_keycloak_client_secret_here", "{}"),
        ("client-id", "dtaas-client", "{}"),
    ],
}

_SERVER_DNS_PLACEHOLDERS = [
    ("SERVER_DNS=localhost", "SERVER_DNS={}"),
    ("SERVER_DNS=intocps.org", "SERVER_DNS={}"),
]

_USER_NAME_PATTERNS = [
    ("USERNAME1=user1", "USERNAME1={}"),
    ("USERNAME2=user2", "USERNAME2={}"),
]

_USER_PATH_PATTERNS = ["/user1", "/user2"]

_USER_EMAIL_PATTERNS = [
    "user1@emailservice.com",
    "user2@emailservice.com",
]
