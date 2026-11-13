"""Prints the lines of the GitLab project step and records each finished
project, for gitlab_common.ensure_projects.

How each project's outcome is worded, and which outcomes are recorded, is
gitlab_common's (project_run.py), shared with the DTaaS CLI. This module
prints each notice as a line with its detail indented below it (a success
green with a check mark, a warning yellow, an error red), and adds each
finished project at once to the user's record in
config/gitlab_user_projects.json (project_state.py), so a re-run never
recreates, re-pushes or warns about it again. A project found with content
is recorded too, so it is warned about once. An empty project found in
place is not, so every run that reaches it warns until the admin deletes
it.
"""

from dataclasses import dataclass, field, replace

from rich.console import Console

from ....gitlab_common import NoticeLevel, ProjectNotice, ProjectRequest
from .project_state import UserRecord, save_record

RERUN = "dtaas-services user add -s gitlab"
# How a notice of each level is printed: (style, mark before its line).
_LOOKS = {
    NoticeLevel.SUCCESS: ("green", "✅ "),
    NoticeLevel.WARNING: ("yellow", "⚠️  "),
    NoticeLevel.ERROR: ("red", ""),
}


@dataclass
class ProjectTally:
    """What the project step did, for the GitLab result line."""

    created: int = 0
    failed: list[str] = field(default_factory=list)

    def summary(self) -> str:
        """The result line's project part, "" when no project was touched."""
        parts = []
        if self.created:
            noun = "project" if self.created == 1 else "projects"
            parts.append(f"{self.created} GitLab {noun} created.")
        if self.failed:
            names = ", ".join(self.failed)
            parts.append(f"GitLab projects failed for {names}: see the lines above.")
        return " ".join(parts)


@dataclass
class UserProgress:
    """One user's record (their account and the projects finished in it),
    to which each project this run finishes is added."""

    record: UserRecord

    def save(self, request: ProjectRequest) -> str:
        """Add *request*'s project to the record and save it: "" or why it
        could not be saved."""
        projects = (*self.record.projects, request.name)
        self.record = replace(self.record, projects=projects)
        return save_record(request.username, self.record)


def say(style: str, headline: str, detail: str = "") -> None:
    """Print *headline*, then each line of *detail* indented below it. Git's
    and GitLab's words are printed as they are, never read as markup."""
    console = Console()
    lines = [f"  {headline}", *(f"    {line}" for line in detail.splitlines())]
    for line in lines:
        console.print(line, style=style, markup=False, highlight=False, soft_wrap=True)


def show(notice: ProjectNotice) -> None:
    """Print one of gitlab_common's project notices in its level's look."""
    style, mark = _LOOKS[notice.level]
    say(style, f"{mark}{notice.headline}", notice.detail)
