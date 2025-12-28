"""Build script to copy external files into the package."""

from pathlib import Path
import shutil


def build(setup_kwargs):
    """
    This function is called by Poetry during build to prepare files.
    """
    copy_external_files()
    return setup_kwargs


def copy_external_files():
    """
    Copy only template files and create empty directory structures.

    This ensures user generated configs and runtime data are NOT included
    in the distributed package.
    """
    cli_dir = Path(__file__).parent
    parent_dir = cli_dir.parent
    pkg_dir = cli_dir / "dtaas_services"
    print("Building dtaas-services package...")

    # 1. Copy compose files
    compose_files = [
        "compose.services.secure.yml",
    ]

    for filename in compose_files:
        src = parent_dir / filename
        dst = pkg_dir / filename

        if src.exists():
            shutil.copy2(src, dst)
            print(f"Copied: {filename}")
        else:
            print(f"Warning: {filename} not found, skipping...")

    # 2. Copy config directory (template and static files only)
    copy_config_templates(parent_dir, pkg_dir)

    # 3. Create data directory structure (empty directories only)
    create_data_structure(pkg_dir)


def _copy_config_file(src_file: Path, dst_file: Path, filename: str) -> None:
    """Copy a single config file if it exists."""
    if src_file.exists():
        shutil.copy2(src_file, dst_file)
        print(f"Copied: config/{filename}")
    else:
        print(f"Warning: config/{filename} not found, skipping...")


def _copy_config_subdirs(src_config: Path, dst_config: Path) -> None:
    """Copy config subdirectories."""
    for subdir in ["influxdb"]:
        src_subdir = src_config / subdir
        dst_subdir = dst_config / subdir

        if src_subdir.exists() and src_subdir.is_dir():
            shutil.copytree(src_subdir, dst_subdir)
            print(f"Copied: config/{subdir}/")


def copy_config_templates(parent_dir: Path, pkg_dir: Path):
    """
    Copy only template files and required static configs from config directory.

    Excludes:
    - services.env (user specific)
    - credentials.csv (user specific)
    - Any runtime generated files
    """
    src_config = parent_dir / "config"
    dst_config = pkg_dir / "config"

    # Remove existing config directory
    if dst_config.exists():
        shutil.rmtree(dst_config)

    # Create fresh config directory
    dst_config.mkdir(parents=True, exist_ok=True)

    # Files to copy
    files_to_copy = [
        "services.env.template",
        "credentials.csv.template",
        "mongod.conf.secure",
        "rabbitmq.conf",
        "rabbitmq.enabled_plugins",
    ]

    for filename in files_to_copy:
        src_file = src_config / filename
        dst_file = dst_config / filename
        _copy_config_file(src_file, dst_file, filename)

    # Copy subdirectories
    _copy_config_subdirs(src_config, dst_config)


def create_data_structure(pkg_dir: Path):
    """
    Create empty data directory structure only.

    NO actual data is copied, only directory structure for services.
    Users will populate these during runtime.
    """
    dst_data = pkg_dir / "data"

    # Remove existing data directory
    if dst_data.exists():
        shutil.rmtree(dst_data)

    # Create fresh data directory
    dst_data.mkdir(parents=True, exist_ok=True)

    # Subdirectories to create (empty)
    data_subdirs = ["grafana", "influxdb", "mongodb", "postgres", "rabbitmq"]

    for subdir in data_subdirs:
        subdir_path = dst_data / subdir
        subdir_path.mkdir(exist_ok=True)
        # Create .gitkeep to ensure directory is included in package
        (subdir_path / ".gitkeep").touch()
        print(f"Created: data/{subdir}/")


if __name__ == "__main__":
    copy_external_files()
