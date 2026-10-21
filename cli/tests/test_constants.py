"""Tests for the constants module: the deploy types every module keys on."""

import pytest
from src.pkg.build import _SOURCES
from src.pkg.certs import TLS_DEPLOY_TYPES
from src.pkg.config_update import _SERVICE_MARKERS
from src.pkg.constants import DEPLOY_TYPES, WORKSPACE_DEPLOY_TYPES
from src.pkg._deploy_data import _DEPLOY_FILES


@pytest.mark.parametrize(
    "keys", [set(_SOURCES), set(_DEPLOY_FILES)], ids=["build-sources", "deploy-files"]
)
def test_per_type_maps_name_exactly_the_deploy_types(keys):
    """A type added to or dropped from DEPLOY_TYPES, and not from a map keyed
    by type, fails here instead of at 'deployment generate' time."""
    assert keys == DEPLOY_TYPES


@pytest.mark.parametrize(
    "subset",
    [
        TLS_DEPLOY_TYPES,
        WORKSPACE_DEPLOY_TYPES,
        {deploy_type for _, deploy_type in _SERVICE_MARKERS},
    ],
    ids=["tls", "workspace", "service-markers"],
)
def test_type_subsets_only_name_deploy_types(subset):
    """Sets and markers that pick some of the types never name an unknown one."""
    assert subset <= DEPLOY_TYPES
