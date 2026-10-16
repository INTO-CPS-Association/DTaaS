"""Run external commands, wait for conditions and report progress."""

import subprocess
import time


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


def wait_until(condition, timeout, interval, description):
    """Call condition until it returns a true value, and return that value.

    Raises TimeoutError naming description if timeout seconds pass first.
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = condition()
        if result:
            return result
        time.sleep(interval)
    raise TimeoutError(f"Timed out waiting for {description}")
