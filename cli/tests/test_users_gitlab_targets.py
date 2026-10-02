"""Tests for the GitLab provisioning target selection (users_gitlab_targets.py)."""

from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users_gitlab_targets
from src.pkg.users_gitlab_targets import (
    GitlabCandidate,
    RunDeadline,
    gitlab_candidates,
    has_gitlab_work,
    not_attempted_notice,
    target_usernames,
)


def _candidate(**details):
    """A candidate with no password and whatever the registry records."""
    fields = {"existing_user_id": None, "pat_issued": False, "projects_created": False}
    return GitlabCandidate("alice", "a@x.io", password=None, **{**fields, **details})


@pytest.mark.parametrize("now,spent", [(599.0, False), (601.0, True)])
def test_run_deadline_passes_when_the_budget_is_spent(monkeypatch, now, spent):
    """The clock runs from the start of the run, not from one import, so ten
    minutes cover every user the run has attempted so far."""
    deadline = RunDeadline(minutes=10, started=0.0)
    monkeypatch.setattr(users_gitlab_targets.time, "monotonic", lambda: now)
    assert deadline.passed() is spent


def test_not_attempted_notice_names_the_users_left():
    """The users a run stopped short of are named, with what to do next."""
    notice = not_attempted_notice(["bob", "carol"])
    assert "bob, carol" in notice
    assert "Re-run" in notice


def test_has_gitlab_work_ignores_a_finished_user_without_a_template():
    """With no template configured no user is ever marked as having their
    projects created, so a finished account must not count as work."""
    candidate = _candidate(existing_user_id=42, pat_issued=True)
    assert has_gitlab_work(candidate, wants_projects=False) is False
    assert has_gitlab_work(candidate, wants_projects=True) is True


def _ctx(details=None, starting=None):
    """A users context holding one registry user, 'alice', and whatever
    dtaas.toml starting users the run can also see."""
    return MagicMock(
        user_list=["alice"],
        users_section={"alice": details or {}},
        starting=starting or {},
    )


def test_target_usernames_start_only_none_means_all_registry_users():
    """start_only=None (config reconcile --fix) targets every registry user."""
    ctx = MagicMock(user_list=["alice", "bob"])
    assert target_usernames(ctx, None, {}) == ["alice", "bob"]


@pytest.mark.parametrize("password", ["pw", None])
def test_target_usernames_adds_a_retry_for_a_user_not_being_started(password):
    """Naming a registered user again, with or without a password, is the
    explicit retry path for a user whose container is not being restarted,
    and picks up nobody else."""
    ctx = MagicMock(user_list=["alice", "bob"])
    named = {"alice": password, "carol": password}
    assert target_usernames(ctx, [], named) == ["alice"]


def test_gitlab_candidates_carry_what_the_registry_records():
    """Both markers reach the candidate, so each half is skipped on its own."""
    details = {
        "email": "a@x.io",
        "gitlab_user_id": 42,
        "gitlab_pat_issued": True,
        "gitlab_projects_created": True,
    }
    candidate = gitlab_candidates(_ctx(details), ["alice"], {"alice": "pw"})[0]
    assert (candidate.username, candidate.email) == ("alice", "a@x.io")
    assert (candidate.existing_user_id, candidate.password) == (42, "pw")
    assert (candidate.pat_issued, candidate.projects_created) == (True, True)


def test_gitlab_candidates_keep_a_missing_password_as_none():
    """A target with no password is still a candidate: their account half is
    skipped, but projects of an account that already exists are not."""
    candidate = gitlab_candidates(_ctx(), ["alice"], {})[0]
    assert candidate.password is None
    assert candidate.pat_issued is False


def test_a_named_starting_user_is_a_candidate_without_being_a_registry_user():
    """Naming a dtaas.toml starting user asks for its GitLab half: it is a
    candidate, its email comes from dtaas.toml, and it is never in the
    registry (where it would be given a second container)."""
    ctx = _ctx(starting={"foo": "foo@intocps.org"})

    with patch("src.pkg.users_gitlab_targets.load_starting_gitlab", return_value={}):
        candidates = gitlab_candidates(ctx, [], {"foo": "pw"})

    assert [c.username for c in candidates] == ["foo"]
    assert (candidates[0].email, candidates[0].password) == ("foo@intocps.org", "pw")
    assert candidates[0].pat_issued is False


def test_a_starting_user_carries_its_own_markers():
    """Its markers live in the registry's starting user section, so a run
    that created the account and failed the projects retries the projects
    alone, exactly as for an additional user."""
    ctx = _ctx(starting={"foo": "foo@intocps.org"})
    markers = {"foo": {"gitlab_user_id": 7, "gitlab_pat_issued": True}}

    with patch(
        "src.pkg.users_gitlab_targets.load_starting_gitlab", return_value=markers
    ):
        candidate = gitlab_candidates(ctx, [], {"foo": None})[0]

    assert (candidate.existing_user_id, candidate.pat_issued) == (7, True)
    assert candidate.projects_created is False


def test_an_unnamed_starting_user_is_not_provisioned():
    """Only the starting users a run names are touched: 'user add alice' must
    not provision every user dtaas.toml declares."""
    ctx = _ctx(starting={"foo": "foo@intocps.org"})

    with patch("src.pkg.users_gitlab_targets.load_starting_gitlab", return_value={}):
        candidates = gitlab_candidates(ctx, ["alice"], {"alice": "pw"})

    assert [c.username for c in candidates] == ["alice"]
