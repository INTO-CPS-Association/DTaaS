"""Tests for the project step of 'user add' (users_gitlab_projects.py)."""

import json
from unittest.mock import patch

import pytest
from src.gitlab_common import ProjectOutcome, ProjectRequest, ProjectResult
from src.pkg.registry import load_registry, register_new_users
from src.pkg.users_gitlab_projects import GitlabRun, provision_projects
from src.pkg.users_gitlab_targets import GitlabCandidate, GitlabUserResult
# pylint: disable=redefined-outer-name

COMMON = "https://gitlab.com/dtaas/common.git"
USER = "https://gitlab.com/dtaas/user1.git"
# The command a failed push names, to provision alice again.
RERUN = "dtaas user add alice"
RUN = GitlabRun("gl", {"common": COMMON, "user": USER})
MODULE = "src.pkg.users_gitlab_projects.gitlabPkg"
# ensure_project as the shared loop of gitlab_common calls it.
ENSURE = "src.gitlab_common.project_run.ensure_project"
CREATED = ProjectResult(ProjectOutcome.CREATED)
TOKEN_FILE = "gitlab_user_tokens.json"
SAVED = {"alice": "saved-alice", "bob": "saved-bob"}


@pytest.fixture(autouse=True)
def registry(tmp_path, monkeypatch):
    """A registry holding alice and bob, and a token file holding the tokens
    an earlier run issued them, in a scratch directory."""
    monkeypatch.chdir(tmp_path)
    register_new_users({"alice": {}, "bob": {}}, [])
    (tmp_path / TOKEN_FILE).write_text(json.dumps(SAVED), encoding="utf-8")
    return tmp_path


@pytest.fixture
def gitlab():
    """Patch git's check (git is usable) and ensure_project (creates)."""
    with patch(f"{MODULE}.git_problem", return_value="") as problem, patch(
        ENSURE, return_value=CREATED
    ) as ensure:
        yield {"problem": problem, "ensure": ensure}


def _new(name, user_id):
    """A candidate whose account and token this run created."""
    candidate = GitlabCandidate(name, f"{name}@x.io", None, "pw")
    return candidate, GitlabUserResult(name, user_id, f"new-{name}", False)


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
    pushed with the token this run issued, and recorded so a re-run never
    makes them again."""
    assert _run(_new("alice", 42)) == []
    assert _requests(gitlab["ensure"]) == [
        ProjectRequest(42, "alice", "common", COMMON, RERUN, "new-alice"),
        ProjectRequest(42, "alice", "user", USER, RERUN, "new-alice"),
    ]
    assert load_registry()["alice"]["gitlab_projects"] == ["common", "user"]
    out = capsys.readouterr().out
    assert (
        f"GitLab project 'alice/common' created.\n  Private, filled from {COMMON}"
        in out
    )


def test_an_earlier_account_gets_only_the_missing_project(gitlab):
    """A finished project is skipped; the missing one is made with the id
    the registry holds, pushed with the token saved for the user, and added
    to the recorded list."""
    assert _run(_earlier("alice", 7, ("common",))) == []
    assert _requests(gitlab["ensure"]) == [
        ProjectRequest(7, "alice", "user", USER, RERUN, "saved-alice")
    ]
    assert load_registry()["alice"]["gitlab_projects"] == ["common", "user"]


@pytest.mark.parametrize(
    "token_file,reason",
    [
        (json.dumps({"bob": "saved-bob"}), ""),
        ("not json", "gitlab_user_tokens.json cannot be read: "),
    ],
    ids=["no-saved-token", "unreadable-file"],
)
def test_without_a_token_the_user_fails_and_others_carry_on(
    gitlab, capsys, registry, token_file, reason
):
    """The push needs the user's own token: without one, no project is
    attempted for that user and they fail, while a user with a token still
    gets theirs. The message says where the token should be."""
    (registry / TOKEN_FILE).write_text(token_file, encoding="utf-8")
    assert _run(_earlier("alice", 7), _new("bob", 43)) == ["alice"]
    assert {r.username for r in _requests(gitlab["ensure"])} == {"bob"}
    out = capsys.readouterr().out
    assert "GitLab projects for 'alice' skipped.\n  " + reason in out
    assert (
        "none is saved for 'alice' in gitlab_user_tokens.json. Put it back, then "
        "run 'dtaas user add alice' again." in out
    )


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


@pytest.mark.parametrize(
    "outcome,expected,recorded",
    [
        (
            ProjectOutcome.HAS_CONTENT,
            "Warning: GitLab project 'alice/common' has content.\n"
            "  It was left as it is: no template was pushed into it.",
            ["user", "common"],
        ),
        (
            ProjectOutcome.EMPTY,
            "Warning: GitLab project 'alice/common' exists but is empty.\n"
            "  It was not created by this run, so no template was pushed into "
            "it. Delete it, then run 'dtaas user add alice' again.",
            None,
        ),
    ],
    ids=["content", "empty"],
)
def test_a_project_found_in_place_warns(gitlab, capsys, outcome, expected, recorded):
    """A project found in place is left alone with a warning, which is not a
    failure. One with content is recorded, so the warning shows once; an
    empty one is not, so every run warns until the admin deletes it."""
    gitlab["ensure"].return_value = ProjectResult(outcome)
    assert _run(_earlier("alice", 7, ("user",))) == []
    assert expected in capsys.readouterr().out
    assert load_registry()["alice"].get("gitlab_projects") == recorded


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


def test_a_project_that_cannot_be_recorded_fails_its_user(gitlab, capsys):
    """A created project the registry cannot record would be pushed to again
    on no run, but warned about on every one: the user fails, and says so."""
    with patch(
        "src.pkg.users_gitlab_projects.set_gitlab_projects",
        side_effect=OSError("disk full"),
    ):
        assert _run(_earlier("alice", 7, ("user",))) == ["alice"]
    gitlab["ensure"].assert_called_once()
    assert "GitLab project 'alice/common' not recorded." in capsys.readouterr().out
