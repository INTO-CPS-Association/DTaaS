"""MkDocs hooks for validating documentation assets."""

from pathlib import Path

from mkdocs.exceptions import Abort

LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1\n"
LFS_MEDIA_SUFFIXES = {".gif", ".jpeg", ".jpg", ".mov", ".mp4", ".png"}
MAX_DISPLAYED_FILES = 10


def find_unresolved_lfs_files(docs_dir: Path) -> list[Path]:
    """Return LFS-managed media files that are still checked out as pointers."""
    unresolved_files: list[Path] = []

    for file_path in docs_dir.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in LFS_MEDIA_SUFFIXES:
            continue
        with open(file_path, "rb") as asset_file:
            if not asset_file.read(len(LFS_POINTER_PREFIX)).startswith(LFS_POINTER_PREFIX):
                continue
            unresolved_files.append(file_path)

    return unresolved_files


def format_unresolved_files(unresolved_files: list[Path], docs_dir: Path) -> str:
    """Format unresolved file paths for MkDocs error output."""
    displayed_files = unresolved_files[:MAX_DISPLAYED_FILES]
    lines = [f"  - {file_path.relative_to(docs_dir).as_posix()}" for file_path in displayed_files]

    if len(unresolved_files) > MAX_DISPLAYED_FILES:
        remaining = len(unresolved_files) - MAX_DISPLAYED_FILES
        lines.append(f"  - ... and {remaining} more")

    return "\n".join(lines)


def on_pre_build(config, **kwargs) -> None:
    """Abort builds that would copy unresolved Git LFS pointers into the site."""
    docs_dir = Path(config.docs_dir)
    docs_dir_pattern = f"{docs_dir.name}/**"
    unresolved_files = find_unresolved_lfs_files(docs_dir)

    if not unresolved_files:
        return

    unresolved_paths = format_unresolved_files(unresolved_files, docs_dir)
    raise Abort(
        "Documentation build aborted because Git LFS assets were not fetched.\n"
        "MkDocs would otherwise copy Git LFS pointer files into the generated site.\n"
        f"Unresolved files in {docs_dir.as_posix()}:\n"
        f"{unresolved_paths}\n\n"
        "Fetch the documentation assets and rerun the build:\n"
        "  git lfs install\n"
        f'  git lfs pull --include="{docs_dir_pattern}"'
    )
