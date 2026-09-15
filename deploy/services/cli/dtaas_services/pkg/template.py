"""Template and project structure management for DTaaS services"""

import shutil
from pathlib import Path
from typing import Tuple
from .lib.utils import SERVICE_DATA_SUBDIRS

# Items that --force may overwrite. They hold only files shipped by the package;
# config files created from templates (services.env and others) are not in the
# package, so copying config/ over an existing folder keeps them.
OVERWRITABLE_ITEMS = {
    "config",
    "compose.services.yml",
    "compose.thingsboard.yml",
    "compose.gitlab.yml",
}


def copy_directory_or_file(src_path: Path, dest_path: Path, item_name: str) -> str:
    """
    Copy a directory or file from source to destination.
    Args:
        src_path: Source path
        dest_path: Destination path
        item_name: Name of the item for display purposes
    Returns:
        Status message string
    """
    if not src_path.exists():
        return f"  Warning: {item_name} not found in package"
    if dest_path.exists():
        return f"  Skipping {item_name} (already exists)"
    # Perform copy and determine suffix
    if src_path.is_dir():
        shutil.copytree(src_path, dest_path)
        suffix = "/"
    else:
        shutil.copy2(src_path, dest_path)
        suffix = ""
    return f"  Created {item_name}{suffix}"


def overwrite_directory_or_file(
    src_path: Path, dest_path: Path, item_name: str
) -> str:
    """
    Copy a package directory or file over an existing destination.
    Files that exist only in the destination are kept.
    Returns:
        Status message string
    """
    if src_path.is_dir():
        shutil.copytree(src_path, dest_path, dirs_exist_ok=True)
        return f"  Overwrote {item_name}/"
    shutil.copy2(src_path, dest_path)
    return f"  Overwrote {item_name}"


def _copy_template_item(src_path: Path, dest_path: Path, force: bool) -> str:
    """Copy one template item, overwriting it only when forced and allowed."""
    item_name = dest_path.name
    can_overwrite = item_name in OVERWRITABLE_ITEMS and dest_path.exists()
    if force and can_overwrite and src_path.exists():
        return overwrite_directory_or_file(src_path, dest_path, item_name)
    return copy_directory_or_file(src_path, dest_path, item_name)


def copy_template_to_config(
    config_dir: Path, template_name: str, actual_name: str
) -> str:
    """
    Copy a template file to its actual config file if it doesn't exist.
    Args:
        config_dir: Directory containing config files
        template_name: Name of the template file
        actual_name: Name of the actual config file
    Returns:
        Status message string
    """
    template_file = config_dir / template_name
    actual_file = config_dir / actual_name
    if template_file.exists() and not actual_file.exists():
        shutil.copy2(template_file, actual_file)
        return f"  Created config/{actual_name} from template"
    return ""


def _copy_template_items(target_dir: Path, package_root: Path, force: bool) -> list:
    """Copy template directories and files to target and return status messages."""
    templates_root = package_root / "templates"
    items_to_copy = [
        "config",
        "data",
        "log",
        "certs",
        "compose.services.yml",
        "compose.thingsboard.yml",
        "compose.gitlab.yml",
    ]
    messages = [
        _copy_template_item(templates_root / item, target_dir / item, force)
        for item in items_to_copy
    ]
    return [msg for msg in messages if msg]


def _copy_template_configs(target_dir: Path, messages: list) -> None:
    """Copy template files to actual config files."""
    config_dir = target_dir / "config"
    template_mappings = [
        ("services.env.template", "services.env"),
        ("credentials.csv.template", "credentials.csv"),
        ("gitlab_oauth.json.template", "gitlab_oauth.json"),
    ]
    for template_name, actual_name in template_mappings:
        msg = copy_template_to_config(config_dir, template_name, actual_name)
        if msg:
            messages.append(msg)


def _create_data_subdirs(target_dir: Path) -> None:
    """Create data subdirectories for services."""
    data_dir = target_dir / "data"
    for subdir in SERVICE_DATA_SUBDIRS:
        (data_dir / subdir).mkdir(parents=True, exist_ok=True)


def generate_project_structure(
    target_dir: Path, package_root: Path, force: bool = False
) -> Tuple[bool, str]:
    """
    Generate project structure with template config, data directories, and compose file.
    Args:
        target_dir: Target directory for project generation
        package_root: Root directory of the package containing template files
        force: Overwrite existing compose files and package files under config/
    Returns:
        Tuple of (success, message or error)
    """
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        messages = [f"Generating project structure in {target_dir}..."]
        # Copy directories and files
        messages.extend(_copy_template_items(target_dir, package_root, force))
        # Copy template files to actual config files
        _copy_template_configs(target_dir, messages)
        # Create data subdirectories for services
        _create_data_subdirs(target_dir)
        messages.append(f"\nProject structure generated successfully in {target_dir}!")
        return True, "\n".join(messages)
    except OSError as e:
        return False, f"Failed to generate project: {e}"
