"""Tests for the GitLab provisioning target selection (users_gitlab_targets.py)."""

from unittest.mock import MagicMock, patch
import pytest
from src.pkg.users_gitlab_targets import gitlab_candidates, target_usernames


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
    """The registry's markers reach the candidate, so a finished account is
    skipped rather than created again."""
    details = {"email": "a@x.io", "gitlab_user_id": 42, "gitlab_pat_issued": True}
    candidate = gitlab_candidates(_ctx(details), ["alice"], {"alice": "pw"})[0]
    assert (candidate.username, candidate.email) == ("alice", "a@x.io")
    assert (candidate.existing_user_id, candidate.password) == (42, "pw")
    assert candidate.pat_issued is True


def test_gitlab_candidates_keep_a_missing_password_as_none():
    """A target with no password is still a candidate, whose account step is
    then reported as skipped rather than dropped in silence."""
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
    """Its markers live in the registry's starting user section, so a re-run
    skips an account that is already done, exactly as for an additional
    user."""
    ctx = _ctx(starting={"foo": "foo@intocps.org"})
    markers = {"foo": {"gitlab_user_id": 7, "gitlab_pat_issued": True}}

    with patch(
        "src.pkg.users_gitlab_targets.load_starting_gitlab", return_value=markers
    ):
        candidate = gitlab_candidates(ctx, [], {"foo": None})[0]

    assert (candidate.existing_user_id, candidate.pat_issued) == (7, True)


def test_an_unnamed_starting_user_is_not_provisioned():
    """Only the starting users a run names are touched: 'user add alice' must
    not provision every user dtaas.toml declares."""
    ctx = _ctx(starting={"foo": "foo@intocps.org"})

    with patch("src.pkg.users_gitlab_targets.load_starting_gitlab", return_value={}):
        candidates = gitlab_candidates(ctx, ["alice"], {"alice": "pw"})

    assert [c.username for c in candidates] == ["alice"]
