"""Template and project structure management for DTaaS services"""

import shutil
from pathlib import Path
from typing import Tuple


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


def _copy_template_items(target_dir: Path, package_root: Path, messages: list) -> None:
    """Copy template directories and files to target."""
    items_to_copy = [
        ("config", "config"),
        ("data", "data"),
        ("compose.services.secure.yml", "compose.services.secure.yml"),
    ]
    for src_item, dest_item in items_to_copy:
        src_path = package_root / src_item
        dest_path = target_dir / dest_item
        msg = copy_directory_or_file(src_path, dest_path, dest_item)
        if msg:
            messages.append(msg)


def _copy_template_configs(target_dir: Path, messages: list) -> None:
    """Copy template files to actual config files."""
    config_dir = target_dir / "config"
    template_mappings = [
        ("services.env.template", "services.env"),
        ("credentials.csv.template", "credentials.csv"),
    ]
    for template_name, actual_name in template_mappings:
        msg = copy_template_to_config(config_dir, template_name, actual_name)
        if msg:
            messages.append(msg)


def _create_data_subdirs(target_dir: Path) -> None:
    """Create data subdirectories for services."""
    data_dir = target_dir / "data"
    data_subdirs = ["grafana", "influxdb", "mongodb", "rabbitmq"]
    for subdir in data_subdirs:
        (data_dir / subdir).mkdir(parents=True, exist_ok=True)


def generate_project_structure(
    target_dir: Path, package_root: Path
) -> Tuple[bool, str]:
    """
    Generate project structure with template config, data directories, and compose file.
    Args:
        target_dir: Target directory for project generation
        package_root: Root directory of the package containing template files
    Returns:
        Tuple of (success, message or error)
    """
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        messages = [f"Generating project structure in {target_dir}..."]
        # Copy directories and files
        _copy_template_items(target_dir, package_root, messages)
        # Copy template files to actual config files
        _copy_template_configs(target_dir, messages)
        # Create data subdirectories for services
        _create_data_subdirs(target_dir)
        messages.append(f"\nProject structure generated successfully in {target_dir}!")
        return True, "\n".join(messages)
    except OSError as e:
        return False, f"Failed to generate project: {e}"
