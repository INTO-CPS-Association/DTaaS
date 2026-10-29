"""Unit tests for commit_msg_check."""

import tempfile
import unittest
from pathlib import Path

import commit_msg_check


class OffendingLinesTest(unittest.TestCase):
    """Which lines of a message the check refuses."""

    def test_plain_message_passes(self):
        """A message with no trailer passes."""
        text = "fix(client): keep the theme on reload\n\nThe theme was lost.\n"
        self.assertEqual(commit_msg_check.offending_lines(text), [])

    def test_co_author_trailer_naming_a_tool_is_refused(self):
        """A co-author trailer that names a tool is refused."""
        line = "Co-Authored-By: Claude <noreply@anthropic.com>"
        text = f"fix: x\n\n{line}\n"
        self.assertEqual(commit_msg_check.offending_lines(text), [line])

    def test_co_author_trailer_naming_a_person_passes(self):
        """A co-author trailer that names a person passes."""
        text = "fix: x\n\nCo-Authored-By: Ada Lovelace <ada@example.org>\n"
        self.assertEqual(commit_msg_check.offending_lines(text), [])

    def test_generated_with_line_is_refused(self):
        """A generated-with line that names a tool is refused."""
        line = "Generated with [Claude Code](https://claude.com/claude-code)"
        self.assertEqual(commit_msg_check.offending_lines(f"fix: x\n\n{line}\n"), [line])

    def test_tool_trailer_is_refused_in_any_case(self):
        """A tool trailer is refused whatever its letter case."""
        text = "fix: x\n\nai-assisted: yes\n"
        self.assertEqual(commit_msg_check.offending_lines(text), ["ai-assisted: yes"])

    def test_prose_that_names_a_tool_passes(self):
        """Prose that mentions a tool is not a trailer and passes."""
        text = "docs: explain the .claude/skills stubs\n\nCopilot reads AGENTS.md.\n"
        self.assertEqual(commit_msg_check.offending_lines(text), [])

    def test_comment_lines_git_strips_are_ignored(self):
        """Comment lines are stripped by git, so they are not checked."""
        text = "fix: x\n# Co-Authored-By: Claude\n"
        self.assertEqual(commit_msg_check.offending_lines(text), [])


class MainTest(unittest.TestCase):
    """Exit status of the hook entry point."""

    def write_message(self, text: str) -> str:
        """Write text to a temporary message file and return its path."""
        with tempfile.NamedTemporaryFile(
            "w", suffix=".txt", delete=False, encoding="utf-8"
        ) as handle:
            handle.write(text)
        self.addCleanup(Path(handle.name).unlink)
        return handle.name

    def test_clean_message_exits_zero(self):
        """A clean message exits with status 0."""
        path = self.write_message("fix: x\n")
        self.assertEqual(commit_msg_check.main(["hook", path]), 0)

    def test_refused_message_exits_one(self):
        """A refused message exits with status 1."""
        path = self.write_message("fix: x\n\nCo-Authored-By: Copilot <c@example.org>\n")
        self.assertEqual(commit_msg_check.main(["hook", path]), 1)

    def test_missing_argument_exits_two(self):
        """A call without the file argument exits with status 2."""
        self.assertEqual(commit_msg_check.main(["hook"]), 2)


if __name__ == "__main__":
    unittest.main()
