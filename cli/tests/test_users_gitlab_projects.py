"""Tests for the project step of 'user add' (users_gitlab_projects.py)."""

from unittest.mock import patch

import pytest
from src.pkg.gitlab import ProjectOutcome, ProjectRequest, ProjectResult
from src.pkg.registry import load_registry, register_new_users
from src.pkg.users_gitlab_projects import GitlabRun, provision_projects
from src.pkg.users_gitlab_targets import GitlabCandidate, GitlabUserResult
# pylint: disable=redefined-outer-name

COMMON = "https://gitlab.com/dtaas/common.git"
USER = "https://gitlab.com/dtaas/user1.git"
RUN = GitlabRun("gl", {"common": COMMON, "user": USER})
MODULE = "src.pkg.users_gitlab_projects.gitlabPkg"
CREATED = ProjectResult(ProjectOutcome.CREATED)


@pytest.fixture(autouse=True)
def registry(tmp_path, monkeypatch):
    """A registry holding alice and bob, in a scratch directory."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {}, "bob": {}}, [])


@pytest.fixture
def gitlab():
    """Patch git's check (git is usable) and ensure_project (creates)."""
    with patch(f"{MODULE}.git_problem", return_value="") as problem, patch(
        f"{MODULE}.ensure_project", return_value=CREATED
    ) as ensure:
        yield {"problem": problem, "ensure": ensure}


def _new(name, user_id):
    """A candidate whose account and token this run created."""
    candidate = GitlabCandidate(name, f"{name}@x.io", None, "pw")
    return candidate, GitlabUserResult(name, user_id, "glpat-x", False)


def _earlier(name, user_id, projects=()):
    """A candidate whose account and token an earlier run created."""
    candidate = GitlabCandidate(name, "", user_id, None, True, projects)
    return candidate, GitlabUserResult(name, None, None, False)


def _run(*pairs):
    """provision_projects over (candidate, result) pairs."""
    return provision_projects(RUN, [c for c, _ in pairs], [r for _, r in pairs])


def _requests(ensure):
    """The ProjectRequests ensure_project was called with."""
    return [call.args[1] for call in ensure.call_args_list]


def test_a_new_account_gets_both_projects_recorded(gitlab, capsys):
    """Both projects are made in the user's namespace, in template order,
    and recorded so a re-run never makes them again."""
    assert _run(_new("alice", 42)) == []
    assert _requests(gitlab["ensure"]) == [
        ProjectRequest(42, "alice", "common", COMMON),
        ProjectRequest(42, "alice", "user", USER),
    ]
    assert load_registry()["alice"]["gitlab_projects"] == ["common", "user"]
    out = capsys.readouterr().out
    assert (
        f"GitLab project 'alice/common' created.\n  Private, filled from {COMMON}"
        in out
    )


def test_an_earlier_account_gets_only_the_missing_project(gitlab):
    """A finished project is skipped; the missing one is made with the id
    the registry holds, and added to the recorded list."""
    assert _run(_earlier("alice", 7, ("common",))) == []
    assert _requests(gitlab["ensure"]) == [ProjectRequest(7, "alice", "user", USER)]
    assert load_registry()["alice"]["gitlab_projects"] == ["common", "user"]


@pytest.mark.parametrize(
    "result",
    [
        GitlabUserResult("alice", None, None, True),
        GitlabUserResult("alice", None, None, False),
        None,
    ],
    ids=["account-failed", "no-password", "not-attempted"],
)
def test_no_project_without_a_ready_account(gitlab, result):
    """Projects follow a successful account and token step only, and git is
    not even checked when nobody is ready."""
    candidate = GitlabCandidate("alice", "", None, None)
    results = [result] if result else []
    assert provision_projects(RUN, [candidate], results) == []
    gitlab["ensure"].assert_not_called()
    gitlab["problem"].assert_not_called()


def test_nothing_when_no_templates_are_set(gitlab):
    """Both template keys left out: accounts and tokens only."""
    candidate, result = _new("alice", 42)
    assert provision_projects(GitlabRun("gl", {}), [candidate], [result]) == []
    gitlab["problem"].assert_not_called()


def test_a_project_with_content_warns_and_is_not_recorded(gitlab, capsys):
    """Content is left alone with a warning, which is not a failure; it is
    not recorded, so every later run warns again."""
    gitlab["ensure"].return_value = ProjectResult(ProjectOutcome.HAS_CONTENT)
    assert _run(_earlier("alice", 7, ("user",))) == []
    assert (
        "Warning: GitLab project 'alice/common' has content." in capsys.readouterr().out
    )
    assert "gitlab_projects" not in load_registry()["alice"]


@pytest.mark.parametrize(
    "outcome",
    [
        ProjectResult(ProjectOutcome.FAILED, "quota reached"),
        RuntimeError("quota reached"),
    ],
    ids=["reported", "unexpected"],
)
def test_a_failed_project_fails_its_user_alone(gitlab, capsys, outcome):
    """A failure is that user's: their other project and the next user are
    still attempted, and only the finished project is recorded."""
    effects = {"common": outcome}
    gitlab["ensure"].side_effect = lambda _gl, req: _raise_or_return(
        effects.get(req.name)
    )
    assert _run(_new("alice", 42), _new("bob", 43)) == ["alice", "bob"]
    assert len(gitlab["ensure"].call_args_list) == 4
    assert load_registry()["alice"]["gitlab_projects"] == ["user"]
    assert (
        "GitLab project 'bob/common' failed.\n  quota reached"
        in capsys.readouterr().out
    )


def _raise_or_return(effect):
    """ensure_project's stand in: raise *effect*, return it, or CREATED."""
    if isinstance(effect, Exception):
        raise effect
    return effect or CREATED


def test_without_git_every_waiting_user_fails_once(gitlab, capsys):
    """git is checked once, before any project: without it every user who
    needed a project fails, and nothing is created."""
    gitlab["problem"].return_value = "git is not installed, or not on PATH."
    assert _run(_new("alice", 42), _earlier("bob", 7)) == ["alice", "bob"]
    gitlab["ensure"].assert_not_called()
    gitlab["problem"].assert_called_once()
    out = capsys.readouterr().out
    assert out.count("GitLab projects skipped for every user.") == 1


def test_an_empty_project_filled_is_reported_as_filled(gitlab, capsys):
    """A project that existed empty says it was filled, not created."""
    gitlab["ensure"].return_value = ProjectResult(ProjectOutcome.FILLED)
    assert _run(_earlier("alice", 7, ("user",))) == []
    assert "GitLab project 'alice/common' filled." in capsys.readouterr().out


def test_a_project_that_cannot_be_recorded_fails_its_user(gitlab, capsys):
    """A filled project the registry cannot record would be pushed to again
    on no run, but warned about on every one: the user fails, and says so."""
    with patch(
        "src.pkg.users_gitlab_projects.set_gitlab_projects",
        side_effect=OSError("disk full"),
    ):
        assert _run(_earlier("alice", 7, ("user",))) == ["alice"]
    gitlab["ensure"].assert_called_once()
    assert "GitLab project 'alice/common' not recorded." in capsys.readouterr().out
