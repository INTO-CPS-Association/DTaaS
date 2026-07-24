"""Template-copy functions behind 'dtaas config generate' and 'deployment generate'."""

import shutil
import subprocess
from pathlib import Path
import click
from .constants import SECRET_FILENAMES

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
DEPLOY_TEMPLATES_DIR = TEMPLATES_DIR / "deploy"
CONFIG_TOML = "dtaas.toml"
TEMPLATE_FILES = [
    CONFIG_TOML,
    "users.server.yml",
    "users.server.secure.yml",
    "users.resources.yml",
]
USER_TEMPLATE_FILES = [name for name in TEMPLATE_FILES if name != CONFIG_TOML]
DEPLOY_TYPES = {
    "localhost",
    "insecure-server",
    "secure-server",
    "secure-server-gitlab",
    "workspace-localhost",
    "workspace-secure-server",
}


def _copy_template(template_name, dest_dir, force=False):
    """Copy a template file, returning True if skipped."""
    dest = Path(dest_dir) / template_name
    if dest.exists() and not force:
        return True
    shutil.copy2(TEMPLATES_DIR / template_name, dest)
    return False


def _create_workspace_dirs(dest_dir):
    """Create the workspace directory structure."""
    files_template = Path(dest_dir) / "files" / "template"
    files_template.mkdir(parents=True, exist_ok=True)


def _validate_project_inputs(dest_dir):
    """Raise if templates dir is missing; create dest_dir if needed."""
    if not TEMPLATES_DIR.is_dir():
        raise RuntimeError(
            f"Package data missing: templates directory not found at {TEMPLATES_DIR}. "
            "The package may have been installed incorrectly."
        )
    Path(dest_dir).mkdir(parents=True, exist_ok=True)


def _try_copy_template(template_name, dest_dir, force):
    """Copy one template, echoing if skipped. Returns error string or None."""
    try:
        if _copy_template(template_name, dest_dir, force):
            click.echo(f"'{template_name}' already exists, skipping")
    except OSError as exc:
        return str(exc)
    return None


def generate_user_templates(dest_dir=".", force=False):
    """Copy user overlay templates and workspace skeleton."""
    _validate_project_inputs(dest_dir)
    errors = list(
        filter(
            None, (_try_copy_template(n, dest_dir, force) for n in USER_TEMPLATE_FILES)
        )
    )
    if errors:
        raise OSError("\n".join(errors))
    _create_workspace_dirs(dest_dir)


def _copy_config_file(template_name, dest_dir, force):
    """Copy config template, returning True if skipped."""
    skipped = _copy_template(template_name, dest_dir, force)
    if skipped:
        click.echo(f"'{template_name}' already exists, skipping")
    return skipped


def generate_dtaas_toml(dest_dir=".", force=False):
    """Copy dtaas.toml template, returning True if kept."""
    _validate_project_inputs(dest_dir)
    return _copy_config_file(CONFIG_TOML, dest_dir, force)


def generate_config(dest_dir=".", force=False):
    """Copy dtaas.toml and users.csv templates."""
    skipped = generate_dtaas_toml(dest_dir, force)
    _copy_config_file("users.csv", dest_dir, force)
    return skipped


def _copy_file(item, target, force):
    """Copy item to target."""
    if target.exists() and not force:
        click.echo(f"'{target}' already exists, skipping")
        return None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)
    except OSError as exc:
        return str(exc)
    return None


def _check_no_symlinks(src, entries):
    """Raise if any entry is a symlink (security check)."""
    symlinks = [str(e.relative_to(src)) for e in entries if e.is_symlink()]
    if symlinks:
        raise OSError(
            "Template contains symlinks, which are not permitted: "
            + ", ".join(symlinks)
        )


def _copy_tree(src_dir, dest_dir, force=False):
    """Recursively copy src_dir contents into dest_dir."""
    src, dest = Path(src_dir), Path(dest_dir)
    entries = sorted(src.rglob("*"))
    _check_no_symlinks(src, entries)
    errors = list(
        filter(
            None,
            (
                _copy_file(item, dest / item.relative_to(src), force)
                for item in entries
                if item.is_file()
            ),
        )
    )
    if errors:
        raise OSError("\n".join(errors))


def _validate_deploy_inputs(deploy_type, src, dest):
    """Validate inputs for generate_deploy_project."""
    if deploy_type not in DEPLOY_TYPES:
        raise ValueError(
            f"Unknown deploy type '{deploy_type}'. "
            f"Choose from: {', '.join(sorted(DEPLOY_TYPES))}"
        )
    if not src.is_dir():
        raise RuntimeError(
            f"Template directory not found at {src}. "
            "The package may have been installed incorrectly."
        )
    dest.mkdir(parents=True, exist_ok=True)


def _copy_example(example, force):
    """Copy *.example file, chmod'ing secret targets to 0600."""
    target = example.with_suffix("")
    try:
        if force or not target.exists():
            shutil.copy2(example, target)
        if target.name in SECRET_FILENAMES:
            target.chmod(0o600)
    except OSError as exc:
        return str(exc)
    return None


def _copy_example_files(dest_dir, force=False):
    """Copy all *.example files in dest_dir."""
    errors = list(
        filter(
            None,
            (
                _copy_example(ex, force)
                for ex in sorted(Path(dest_dir).rglob("*.example"))
            ),
        )
    )
    if errors:
        raise OSError("\n".join(errors))


def create_user_dirs(dest_dir, usernames):
    """Create files/<username>/ dirs from files/template/."""
    template = Path(dest_dir) / "files" / "template"
    if not template.is_dir():
        return
    for username in usernames:
        user_dir = Path(dest_dir) / "files" / username
        if not user_dir.exists():
            shutil.copytree(template, user_dir)


def set_files_permissions(dest_dir):
    """Set ownership/permissions on files/ dir (requires sudo)."""
    files_dir = Path(dest_dir) / "files"
    if not files_dir.is_dir():
        return
    try:
        subprocess.run(
            ["sudo", "chown", "-R", "1000:100", str(files_dir)],
            check=True,
        )
        subprocess.run(
            ["sudo", "chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
            check=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass


def _has_template_files(src):
    """Check if src has deployment files."""
    return any(p.is_file() and p.name != ".gitkeep" for p in src.rglob("*"))


def warn_stale_root_env(dest_dir):
    """Warn if a stale root .env exists alongside the new config/.env."""
    root_env = Path(dest_dir) / ".env"
    config_env = Path(dest_dir) / "config" / ".env"
    if root_env.is_file() and config_env.is_file():
        click.echo(
            "Warning: both .env and config/.env exist in the deployment directory. "
            "The deployment now reads config/.env (via docker compose --env-file). "
            "The root .env is stale and should be removed to avoid confusion."
        )


def generate_deploy_project(deploy_type, dest_dir=".", force=False):
    """Copy deploy template tree and warn about stale config."""
    src = DEPLOY_TEMPLATES_DIR / deploy_type
    dest = Path(dest_dir)
    _validate_deploy_inputs(deploy_type, src, dest)
    if not _has_template_files(src):
        click.echo(f"Warning: no deployment templates found for '{deploy_type}'")
        return
    _copy_tree(src, dest, force)
    _copy_example_files(dest, force)
    warn_stale_root_env(dest)
