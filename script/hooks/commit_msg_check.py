"""Reject a commit message that credits a coding tool as an author.

pre-commit runs this script at the commit-msg stage and passes the path of
the message file. A person answers for every commit, so a trailer that names
a coding tool as co-author is refused. Disclosure of agent use belongs in the
pull request description, as docs/developer/contributions/coding-agents.md
asks, and this check leaves that untouched.
"""

import re
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


def main(argv: list[str]) -> int:
    """Check the message file named in argv and return the exit status."""
    if len(argv) != 2:
        print("usage: commit_msg_check.py <commit message file>", file=sys.stderr)
        return 2
    found = offending_lines(Path(argv[1]).read_text(encoding="utf-8"))
    if not found:
        return 0
    print("commit-msg: the message credits a coding tool as author:", file=sys.stderr)
    for line in found:
        print(f"    {line}", file=sys.stderr)
    print(
        "Remove the line and commit again. If a coding agent generated "
        "substantial logic, say so in the pull request description.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
