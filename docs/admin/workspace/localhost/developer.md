# 🧑‍💻 Developer Guide

Instructions for developing and testing the Dex companion proxy.

## 🧩 Architecture

The Dex companion proxy (`companion/src/`) sits between the
DTaaS client and the Dex identity provider. It forwards all
HTTP requests to Dex and injects a `profile` claim into
`/dex/userinfo` responses when `preferred_username` is present.

| Module          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `config.py`     | Environment variables and constants      |
| `http_utils.py` | URL handling and HTTP connections        |
| `profile.py`    | Profile claim construction and injection |
| `handler.py`    | HTTP request handler (proxy class)       |
| `__main__.py`   | Server entry point                       |

## Project Structure

```text
companion/
├── src/                 # Source package (mounted in container)
│   ├── __init__.py
│   ├── __main__.py      # Entry point
│   ├── config.py        # Environment config and constants
│   ├── handler.py       # HTTP request handler
│   ├── http_utils.py    # URL and connection utilities
│   └── profile.py       # Profile claim injection
└── test/                # Test package
    ├── __init__.py
    ├── conftest.py      # Shared fixtures
    ├── test_handler.py  # Handler method tests
    ├── test_http_utils.py   # URL/connection tests
    ├── test_integration.py  # Full proxy round-trip tests
    └── test_profile.py  # Profile claim tests
```

## Prerequisites

- Python 3.12+
- pip

## Setup

Install test dependencies:

```bash
pip install pytest pytest-cov
```

Install linting tools:

```bash
pip install flake8 pylint ruff
```

## Running Tests

From the `deploy/workspace/dex/localhost/` directory:

```bash
pytest -v --cov=companion/src --cov-report=xml \
  --cov-report=term-missing companion/test
```

## Linting

From the `deploy/workspace/dex/localhost/` directory:

```bash
# flake8
flake8 --count --max-complexity=10 companion

# pylint
pylint --fail-under=9 --recursive=y companion

# ruff format check
ruff format --check companion
```

## Docker

The `docker-compose.yml` mounts only `companion/src/` into the
dex-companion container at `/app/companion/src/`. The container
runs `python -m companion.src` from `/app`.

To test locally without Docker:

```bash
cd deploy/workspace/dex/localhost
DEX_UPSTREAM=http://localhost:5556 \
COMPANION_BIND=127.0.0.1 \
COMPANION_PORT=5557 \
python -m companion.src
```
