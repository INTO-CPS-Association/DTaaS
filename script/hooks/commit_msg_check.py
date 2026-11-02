"""Reject a commit message that credits a coding tool as an author.

pre-commit runs this script at the commit-msg stage and passes the path of
the message file. A person answers for every commit, so a trailer that names
a coding tool as co-author is refused. Disclosure of agent use belongs in the
pull request description, as docs/developer/contributions/coding-agents.md
asks, and this check leaves that untouched.
"""

import re
import subprocess
import sys
from pathlib import Path

TOOLS = r"(claude|anthropic|chatgpt|openai|copilot|gemini|codex)"

# Each pattern is matched against one line at a time. The trailers are
# anchored to the start of the line, so prose that mentions a tool passes.
FORBIDDEN = re.compile(
    "|".join(
        [
            rf"^co-authored-by:.*{TOOLS}",
            r"^(generated-by|ai-assisted|llm-generated):",
            rf"\bgenerated (with|by) \[?{TOOLS}",
            r"noreply@anthropic\.com",
        ]
    ),
    re.IGNORECASE,
)


def message_lines(text: str) -> list[str]:
    """Return the lines git keeps, without the comment lines it strips."""
    return [line for line in text.splitlines() if not line.startswith("#")]


def offending_lines(text: str) -> list[str]:
    """Return every kept line that credits a coding tool."""
    return [line for line in message_lines(text) if FORBIDDEN.search(line.strip())]


def git_dir() -> Path:
    """Return the git directory of the current repository or worktree."""
    out = subprocess.run(
        ["git", "rev-parse", "--absolute-git-dir"],
        capture_output=True, text=True, check=True,
    )
    return Path(out.stdout.strip()).resolve()


def message_path(arg: str, base: Path) -> Path | None:
    """Resolve arg and return it only when it is a file inside base.

    git writes the message to COMMIT_EDITMSG in the git directory, so a
    path outside it is not a commit message and is not read.
    """
    path = Path(arg).resolve()
    if path.is_relative_to(base) and path.is_file():
        return path
    return None


def report(found: list[str]) -> None:
    """Print the refused lines and what to do about them."""
    print("commit-msg: the message credits a coding tool as author:", file=sys.stderr)
    for line in found:
        print(f"    {line}", file=sys.stderr)
    print(
        "Remove the line and commit again. If a coding agent generated "
        "substantial logic, say so in the pull request description.",
        file=sys.stderr,
    )


def main(argv: list[str], base: Path | None = None) -> int:
    """Check the message file named in argv and return the exit status."""
    if len(argv) != 2:
        print("usage: commit_msg_check.py <commit message file>", file=sys.stderr)
        return 2
    path = message_path(argv[1], base or git_dir())
    if path is None:
        print("commit-msg: the message file is not in the git directory", file=sys.stderr)
        return 2
    found = offending_lines(path.read_text(encoding="utf-8"))
    if found:
        report(found)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
