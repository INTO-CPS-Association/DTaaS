"""Build script to copy template files into the package."""

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
    Copy the templates/ directory into dtaas_services/templates/.

    The templates/ directory is the single source of truth for all files
    copied during the generate-project command.
    """
    cli_dir = Path(__file__).parent
    src_templates = cli_dir / "templates"
    dst_templates = cli_dir / "dtaas_services" / "templates"

    print("Building dtaas-services package...")

    if not src_templates.exists():
        print(f"Warning: templates/ directory not found at {src_templates}")
        return

    if dst_templates.exists():
        shutil.rmtree(dst_templates)

    shutil.copytree(src_templates, dst_templates)
    print(f"Copied templates/ -> dtaas_services/templates/")


if __name__ == "__main__":
    copy_external_files()
