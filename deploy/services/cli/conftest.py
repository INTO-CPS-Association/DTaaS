"""
Pytest configuration and fixtures for DTaaS Services CLI tests.
"""
from pathlib import Path
import traceback
import dtaas_services
from dtaas_services.pkg.template import generate_project_structure


def pytest_configure(config):
    """
    Register custom pytest marks and set up test environment.
    This hook runs before tests are collected.
    """
    config.addinivalue_line(
        "markers", "system: mark test as a system/integration test that requires full environment setup"
    )

    # Set up the test environment by generating project structure
    try:
        # Use the CLI package root as the base directory for tests
        package_root = Path(dtaas_services.__file__).parent
        target_dir = Path.cwd()

        # Always regenerate project structure to ensure all files are in place
        # This is needed for system tests to run properly
        success, message = generate_project_structure(target_dir, package_root)
        if success:
            print(f"\nTest environment setup: {message}")
        else:
            print(f"\nTest environment setup warning: {message}")
    except Exception as e:
        print(f"\nWarning: Failed to set up test environment: {e}")
        traceback.print_exc()

