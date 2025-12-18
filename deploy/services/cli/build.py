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
    """Copy config, data, and compose files from parent directory."""
    cli_dir = Path(__file__).parent
    parent_dir = cli_dir.parent
    
    # Define source and destination paths
    files_to_copy = [
        ("config", "config"),
        ("data", "data"),
        ("compose.services.secure.yml", "compose.services.secure.yml"),
    ]
    
    for src_name, dst_name in files_to_copy:
        src = parent_dir / src_name
        dst = cli_dir / "dtaas_services" / dst_name
        
        if not src.exists():
            print(f"Warning: Source {src} does not exist, skipping...")
            continue
        
        # Remove existing destination if it exists
        if dst.exists():
            if dst.is_dir():
                shutil.rmtree(dst)
            else:
                dst.unlink()
        
        # Copy files or directories
        if src.is_dir():
            shutil.copytree(src, dst)
            print(f"Copied directory: {src} -> {dst}")
        else:
            shutil.copy2(src, dst)
            print(f"Copied file: {src} -> {dst}")


if __name__ == "__main__":
    copy_external_files()
