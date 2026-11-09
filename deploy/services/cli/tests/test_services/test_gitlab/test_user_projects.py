"""Tests for the GitLab project step (user_projects.py): which users it
reaches, with which id and token, and what stops it. The git check, the
project call and the user lookup are patched where user_projects.py imports
them, and the project base dir is in tmp_path."""

import json
from types import SimpleNamespace

import pytest
from dtaas_services.gitlab_common import ProjectOutcome, ProjectRequest, ProjectResult
from dtaas_services.pkg.services.gitlab import tokens_file
from dtaas_services.pkg.services.gitlab.user_projects import (
    Account,
    ProjectRun,
    ProjectTally,
    provision_projects,
)

MODULE = "dtaas_services.pkg.services.gitlab.user_projects"
COMMON = "https://gitlab.com/dtaas/common.git"
USER = "https://gitlab.com/dtaas/user1.git"
TEMPLATES = {"common": COMMON, "user": USER}
RERUN = "dtaas-services user add -s gitlab"
NEW_TOKEN = "fake-new-token"  # noqa: S105 # NOSONAR
SAVED_TOKEN = "fake-saved-token"  # noqa: S105 # NOSONAR
CREATED = ProjectResult(ProjectOutcome.CREATED)
NEW_ALICE = Account("alice", 42, NEW_TOKEN)
# pylint: disable=W0621


def write_json(path, data):
    """Write *data* as JSON to *path*."""
    path.write_text(json.dumps(data), encoding="utf-8")


def read_json(path):
    """The JSON object saved in *path*."""
    return json.loads(path.read_text(encoding="utf-8"))


def requests_of(ensure):
    """The ProjectRequests the patched ensure_project was called with."""
    return [call.args[1] for call in ensure.call_args_list]


@pytest.fixture
def gitlab(mocker, tmp_path):
    """The project base dir in tmp_path, git usable, every project created
    and every lookup answering id 7: with the run, the config folder and
    the paths of the token and finished projects files."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    config = tmp_path / "config"
    config.mkdir()
    tokens = config / "gitlab_user_tokens.json"
    return SimpleNamespace(
        ensure=mocker.patch(f"{MODULE}.ensure_project", return_value=CREATED),
        git=mocker.patch(f"{MODULE}.git_problem", return_value=""),
        find=mocker.patch(f"{MODULE}.find_user_id", return_value=(7, "")),
        run=ProjectRun("gl", TEMPLATES, tokens),
        tokens=tokens,
        finished=config / "gitlab_user_projects.json",
    )


def test_without_templates_nothing_happens(gitlab):
    """Both template keys left out means accounts and tokens only."""
    run = ProjectRun("gl", {}, gitlab.run.tokens_path)

    assert provision_projects(run, [NEW_ALICE]) == ProjectTally()
    gitlab.git.assert_not_called()
    gitlab.ensure.assert_not_called()


def test_a_new_account_gets_both_projects_recorded(gitlab, capsys):
    """Both projects are made in the user's namespace with the id and token
    of this run, in template order, and recorded, so a re-run never makes
    them again."""
    tally = provision_projects(gitlab.run, [NEW_ALICE])

    assert requests_of(gitlab.ensure) == [
        ProjectRequest(42, "alice", "common", COMMON, RERUN, NEW_TOKEN),
        ProjectRequest(42, "alice", "user", USER, RERUN, NEW_TOKEN),
    ]
    gitlab.find.assert_not_called()
    assert read_json(gitlab.finished) == {"alice": ["common", "user"]}
    assert tally == ProjectTally(created=2)
    out = capsys.readouterr().out
    assert (
        f"  ✅ GitLab project 'alice/common' created.\n    Private, filled from {COMMON}\n"
        in out
    )
    assert NEW_TOKEN not in out


def test_an_existing_account_uses_its_saved_token_and_looked_up_id(gitlab):
    """An account made by an earlier run is found by username and pushes
    with the token saved for it, the sign that this CLI made it."""
    write_json(gitlab.tokens, {"alice": SAVED_TOKEN, "bob": "other"})

    tally = provision_projects(gitlab.run, [Account("alice")])

    gitlab.find.assert_called_once_with("gl", "alice")
    assert [r.user_id for r in requests_of(gitlab.ensure)] == [7, 7]
    assert {r.token for r in requests_of(gitlab.ensure)} == {SAVED_TOKEN}
    assert not tally.failed


@pytest.mark.parametrize(
    "saved,in_detail",
    [
        (None, ""),
        ({"bob": SAVED_TOKEN}, ""),
        ({"alice": 5}, ""),
        ("{not json", "Failed to read"),
    ],
    ids=["no-file", "other-user", "not-a-string", "unreadable"],
)
def test_an_existing_account_without_a_saved_token_fails(
    gitlab, capsys, saved, in_detail
):
    """Without a token of the user's own, no project is attempted and the
    user fails, with how to finish. An unreadable token file says why."""
    if isinstance(saved, dict):
        write_json(gitlab.tokens, saved)
    elif saved is not None:
        gitlab.tokens.write_text(saved, encoding="utf-8")

    tally = provision_projects(gitlab.run, [Account("alice")])

    assert tally.failed == ["alice"]
    gitlab.ensure.assert_not_called()
    gitlab.find.assert_not_called()
    out = capsys.readouterr().out
    assert "  GitLab projects for 'alice' skipped.\n" in out
    assert "none is saved for 'alice' in config/gitlab_user_tokens.json" in out
    assert f"then run '{RERUN}' again." in out
    assert in_detail in out


def test_a_failed_lookup_fails_the_user(gitlab, capsys):
    """An account GitLab cannot find gets no project: its words are shown."""
    write_json(gitlab.tokens, {"alice": SAVED_TOKEN})
    gitlab.find.return_value = (None, "GitLab has no user named 'alice'.")

    tally = provision_projects(gitlab.run, [Account("alice")])

    assert tally.failed == ["alice"]
    gitlab.ensure.assert_not_called()
    out = capsys.readouterr().out
    assert "  GitLab projects for 'alice' failed.\n" in out
    assert "    GitLab has no user named 'alice'.\n" in out


def test_finished_projects_are_skipped_without_asking_gitlab(gitlab):
    """A recorded project is never looked up again: only the missing one
    is made, and a user with both recorded costs no git check at all."""
    write_json(gitlab.finished, {"alice": ["common"], "bob": ["common", "user"]})

    provision_projects(gitlab.run, [NEW_ALICE, Account("bob", 9, "t")])

    assert [r.name for r in requests_of(gitlab.ensure)] == ["user"]
    assert read_json(gitlab.finished)["alice"] == ["common", "user"]

    gitlab.git.reset_mock()
    provision_projects(gitlab.run, [Account("bob", 9, "t")])
    gitlab.git.assert_not_called()


def test_without_git_every_user_with_work_fails(gitlab, capsys):
    """git is checked once, before any project: without it no project is
    touched and every user who needed one fails."""
    gitlab.git.return_value = "git is not installed, or not on PATH."

    tally = provision_projects(gitlab.run, [NEW_ALICE, Account("bob", 9, "t")])

    assert tally.failed == ["alice", "bob"]
    gitlab.git.assert_called_once()
    gitlab.ensure.assert_not_called()
    out = capsys.readouterr().out
    assert "  GitLab projects skipped for every user.\n" in out
    assert "    git is not installed, or not on PATH.\n" in out


@pytest.mark.parametrize("content", ["{not json", "[1]"])
def test_an_unreadable_finished_file_fails_every_user(gitlab, capsys, content):
    """Without knowing what is finished, no project is touched, and the file
    is left as it is."""
    gitlab.finished.write_text(content, encoding="utf-8")

    tally = provision_projects(gitlab.run, [NEW_ALICE])

    assert tally.failed == ["alice"]
    gitlab.ensure.assert_not_called()
    assert gitlab.finished.read_text(encoding="utf-8") == content
    assert "config/gitlab_user_projects.json cannot be read" in capsys.readouterr().out


def test_the_token_is_kept_out_of_the_account_repr():
    """An account printed in a traceback or a log never shows the token."""
    assert NEW_TOKEN not in repr(NEW_ALICE)


@pytest.mark.parametrize(
    "first",
    [ProjectResult(ProjectOutcome.FAILED, "Could not clone x."), RuntimeError("boom")],
    ids=["reported", "unexpected"],
)
def test_a_failed_project_never_stops_the_next(gitlab, capsys, first):
    """A failure is this project's alone, an unexpected exception included:
    it fails the user, and the user's next project and the next user are
    still attempted."""
    gitlab.ensure.side_effect = [first, CREATED, CREATED, CREATED]

    tally = provision_projects(gitlab.run, [NEW_ALICE, Account("bob", 9, "t")])

    assert tally == ProjectTally(created=3, failed=["alice"])
    assert read_json(gitlab.finished) == {"alice": ["user"], "bob": ["common", "user"]}
    assert "  GitLab project 'alice/common' failed.\n" in capsys.readouterr().out
