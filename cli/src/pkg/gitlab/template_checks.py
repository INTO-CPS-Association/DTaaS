"""Checks a cloned template before anything is pushed from it.

A template is refused when its default branch has no commit, or holds Git
LFS pointer files: a bare clone checks nothing out, so no LFS filter runs,
and pushing the pointers would give users stubs instead of their files.

A file is a pointer only when it looks like one, as the LFS specification
defines it: under 1024 bytes, with a version line, a sha256 oid line and a
size line. A document that quotes the version line is not one. A
.gitattributes that routes files to LFS is not read: a template can name
LFS there and still store the files themselves (the default 'user1' does),
and such a template pushes whole.
"""

from ...gitlab_common import with_hint
from .git_run import run_git

LFS_POINTER_PATTERNS = (
    "-e",
    r"^version https://git-lfs\.github\.com/spec/v1$",
    "-e",
    r"^oid sha256:[0-9a-f]{64}$",
    "-e",
    r"^size [0-9]+$",
)
LFS_POINTER_MAX_BYTES = 1024
_LISTED_FILES = 3
NO_COMMITS = "The template has no commits."


def _read(repo, args):
    """The NUL separated output of git *args* in *repo*, and "" or why it
    failed; git grep's "no match" (exit 1, nothing on stderr) is no output."""
    done = run_git(["-C", repo, *args])
    if done.returncode == 0 or (done.returncode == 1 and not done.stderr.strip()):
        return [entry for entry in done.stdout.split("\0") if entry], ""
    detail = done.stderr.strip()
    return [], with_hint("Could not read the template's default branch.", detail)


def _small_blobs(repo):
    """The paths at HEAD of files small enough to be LFS pointers, and ""
    or why they could not be listed."""
    entries, error = _read(repo, ["ls-tree", "-r", "-l", "-z", "HEAD"])
    small = set()
    for entry in entries:
        meta, path = entry.split("\t", 1)
        size = meta.split()[3]
        if size.isdigit() and int(size) < LFS_POINTER_MAX_BYTES:
            small.add(path)
    return small, error


def _pointer_files(repo):
    """The LFS pointer files at HEAD, and "" or why they could not be found."""
    args = ["grep", "-I", "-l", "-z", "-E", "--all-match", *LFS_POINTER_PATTERNS]
    matches, error = _read(repo, [*args, "HEAD", "--"])
    if error or not matches:
        return [], error
    small, error = _small_blobs(repo)
    names = (match.split(":", 1)[-1] for match in matches)
    return [name for name in names if name in small], error


def _lfs_problem(repo):
    """Why the default branch of *repo* holds LFS pointers, or ""."""
    files, error = _pointer_files(repo)
    if error or not files:
        return error
    return with_hint(
        "The template uses Git LFS, which is not supported.",
        "LFS pointer files: " + ", ".join(files[:_LISTED_FILES]),
    )


def template_problem(repo):
    """Why the bare clone *repo* cannot be pushed as it is, or "" when it can."""
    head = run_git(["-C", repo, "rev-parse", "--verify", "--quiet", "HEAD^{commit}"])
    if head.returncode != 0:
        return NO_COMMITS
    return _lfs_problem(repo)
