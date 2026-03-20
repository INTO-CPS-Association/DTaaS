# 🧑‍💻 Developer Guide

Instructions for developing and testing the Dex companion proxy.

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
pip install pytest
```

Install linting tools:

```bash
pip install flake8 pylint ruff
```

## Running Tests

From the `deploy/workspace/dex/localhost/` directory:

```bash
python -m pytest companion/test/ -v
```

## Linting

Run all linters from the repository root:

```bash
# flake8
flake8 deploy/workspace/dex/localhost/companion/ \
  --count --max-complexity=10 --max-line-length=100

# pylint
pylint deploy/workspace/dex/localhost/companion/ \
  --rcfile=.pylintrc --fail-under=9 --recursive=y

# ruff format check
ruff format --check deploy/workspace/dex/localhost/companion/
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

## Code Quality Standards

- All files under 250 lines
- All functions under 25 lines
- Pylint score ≥ 9.0
- flake8 and ruff clean
