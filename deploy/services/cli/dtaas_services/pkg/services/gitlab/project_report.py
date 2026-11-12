"""Reports and records the outcome of each project of the GitLab project step.

Each outcome gets a line as it happens, with its detail indented below it:
created, a warning for a project found in place, or a failure. A created
project, and a project found with content, are added at once to the user's
record in config/gitlab_user_projects.json (project_state.py), so a re-run
never recreates, re-pushes or warns about them again. An empty project found
in place is not recorded: every run that reaches it warns until the admin
deletes it.
"""

from dataclasses import dataclass, field, replace

from rich.console import Console

from ....gitlab_common import ProjectOutcome, ProjectRequest, ProjectResult
from .project_state import UserRecord, save_record

RERUN = "dtaas-services user add -s gitlab"
# A project found in place: (end of the warning line, its detail).
_FOUND_WARNINGS = {
    ProjectOutcome.HAS_CONTENT: (
        "has content",
        "It was left as it is: no template was pushed into it.",
    ),
    ProjectOutcome.EMPTY: (
        "exists but is empty",
        "It was not created by this run, so no template was pushed into it. "
        f"Delete it, then run '{RERUN}' again.",
    ),
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
    to which each project this run finishes is added, and the run's tally."""

    record: UserRecord
    tally: ProjectTally


def say(style: str, headline: str, detail: str = "") -> None:
    """Print *headline*, then each line of *detail* indented below it. Git's
    and GitLab's words are printed as they are, never read as markup."""
    console = Console()
    lines = [f"  {headline}", *(f"    {line}" for line in detail.splitlines())]
    for line in lines:
        console.print(line, style=style, markup=False, highlight=False, soft_wrap=True)


def _record(request: ProjectRequest, progress: UserProgress) -> bool:
    """Add *request*'s project to the user's record: True once saved."""
    projects = (*progress.record.projects, request.name)
    progress.record = replace(progress.record, projects=projects)
    error = save_record(request.username, progress.record)
    if error:
        say(
            "red",
            f"GitLab project '{request.path}' not recorded.",
            f"{error}\nThe next run that reaches it warns that it has content, "
            "then records it.",
        )
    return not error


def _created(request: ProjectRequest, progress: UserProgress) -> bool:
    """Record a created project, then say so: True once it is saved."""
    if not _record(request, progress):
        return False
    progress.tally.created += 1
    pinned = f" at commit {request.template_commit}" if request.template_commit else ""
    say(
        "green",
        f"✅ GitLab project '{request.path}' created.",
        f"Private, filled from {request.template_url}{pinned}",
    )
    return True


def _warn_found(
    request: ProjectRequest, outcome: ProjectOutcome, progress: UserProgress
) -> bool:
    """Warn about a project found in place, which is not a failure. One with
    content is recorded as well: True unless that record fails."""
    ending, detail = _FOUND_WARNINGS[outcome]
    say("yellow", f"⚠️  Warning: GitLab project '{request.path}' {ending}.", detail)
    if outcome is ProjectOutcome.HAS_CONTENT:
        return _record(request, progress)
    return True


def report(
    request: ProjectRequest, result: ProjectResult, progress: UserProgress
) -> bool:
    """Print and record one project's *result*: True unless it failed."""
    if result.outcome is ProjectOutcome.FAILED:
        say("red", f"GitLab project '{request.path}' failed.", result.message)
        return False
    if result.outcome in _FOUND_WARNINGS:
        return _warn_found(request, result.outcome, progress)
    return _created(request, progress)
