"""Run the integrated GitLab package on this machine and test its registry.

Usage: python3 developer/local-server/src/local_server.py <command> [options]
See docs/developer/contributions/local-server-testing.md.
"""

import argparse
import subprocess
import sys
import urllib.error
from pathlib import Path

from configure import configure_gitlab
from host import prepare_host, remove_hosts_entry
from package import prepare_package
from registry_check import check_registry
from runner import stop_runner
from settings import Settings
from stack import start, stop


def run_all(settings):
    """Set up everything from scratch and finish with the registry check."""
    prepare_host(settings)
    prepare_package(settings)
    start(settings)
    configure_gitlab(settings)
    return check_registry(settings)


def stop_all(settings):
    """Stop the runner and the services, keeping GitLab's data."""
    stop_runner(settings)
    stop(settings)


def clean(settings):
    """Stop everything, delete GitLab's data, and remove the hosts entry."""
    stop_runner(settings)
    stop(settings, remove_volumes=True)
    remove_hosts_entry(settings.hostname)


COMMANDS = {
    "host": ("Change the host: hosts entry, port limit, mkcert CA", prepare_host),
    "package": ("Copy and configure the package, build images", prepare_package),
    "up": ("Start the services and wait for GitLab", start),
    "configure": ("Create GitLab users and OAuth 2.0 applications", configure_gitlab),
    "check": ("Test the registry by hand and from a pipeline", check_registry),
    "all": ("Run host, package, up, configure and check", run_all),
    "down": ("Stop the runner and the services", stop_all),
    "clean": ("Stop everything, delete GitLab data, remove hosts entry", clean),
}


def common_options():
    """Return a parser with the options that every command accepts."""
    options = argparse.ArgumentParser(add_help=False)
    options.add_argument("--hostname", default="intocps.test",
                         help="test hostname (default: intocps.test)")
    options.add_argument("--registry-port", type=int, default=5050,
                         help="registry port (default: 5050)")
    options.add_argument("--workdir", type=Path,
                         default=Path.home() / "dtaas-local-test",
                         help="working directory (default: ~/dtaas-local-test)")
    return options


def parse_args(argv):
    """Parse the command line into a command name and Settings."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    for name, (summary, _) in COMMANDS.items():
        commands.add_parser(name, help=summary, parents=[common_options()])
    args = parser.parse_args(argv)
    settings = Settings(args.hostname, args.registry_port, args.workdir.resolve())
    return args.command, settings


def main(argv=None):
    """Run one command and return the process exit code."""
    command, settings = parse_args(argv)
    try:
        result = COMMANDS[command][1](settings)
    except (subprocess.CalledProcessError, urllib.error.URLError,
            RuntimeError, TimeoutError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 1 if result is False else 0


if __name__ == "__main__":
    sys.exit(main())
