"""Run external commands and report progress for the local server scripts."""

import subprocess


def run(args, capture=False, input_text=None, cwd=None):
    """Run a command and raise CalledProcessError if it fails.

    Returns the command's standard output when capture is True.
    """
    result = subprocess.run(
        args, check=True, text=True, input=input_text, cwd=cwd,
        capture_output=capture,
    )
    return result.stdout.strip() if capture else ""


def sudo(args, input_text=None):
    """Run a command as root through sudo, which may ask for a password."""
    return run(["sudo", *args], input_text=input_text)


def step(message):
    """Print the name of the step that starts now."""
    print(f"==> {message}", flush=True)
