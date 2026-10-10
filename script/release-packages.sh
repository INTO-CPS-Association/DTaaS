#!/bin/bash
# Build and verify the installation packages attached to GitHub releases.
#
# Usage:
#   script/release-packages.sh build  <version> <out-dir>
#   script/release-packages.sh verify <version> <out-dir>
#
# Each package is <out-dir>/<package>-<version>.zip holding a single
# top-level directory, <package>/, with every tracked file of its source
# directory. Git LFS objects must be checked out first.
set -euo pipefail

LFS_POINTER='version https://git-lfs.github.com/spec/v1'
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Package name, then source directory relative to the repository root.
packages() {
  cat <<'EOF'
dtaas-localhost deploy/dtaas/docker/localhost
dtaas-server deploy/dtaas/docker/server
dtaas-secure-server deploy/dtaas/docker/secure-server
dtaas-secure-server-integrated-gitlab deploy/dtaas/docker/secure-server_with_integrated-gitlab
workspace-dex-localhost deploy/workspace/dex/localhost
workspace-keycloak-production deploy/workspace/keycloak/production
EOF
}

fail() {
  echo "error: $*" >&2
  exit 1
}

reject_lfs_pointers() {
  local pointers
  pointers=$(grep -rlxF "$LFS_POINTER" "$1" || true)
  [ -z "$pointers" ] ||
    fail "Git LFS pointers instead of content (run 'git lfs pull'):
$pointers"
}

# Packages must match a commit, so staged or unstaged edits are refused.
require_committed() {
  git diff --quiet HEAD -- "$1" ||
    fail "$1 has uncommitted changes; commit or discard them first"
}

# Copy the tracked files of src into <stage>/<name>/; tar keeps file modes.
stage_package() {
  local name="$1" src="$2" stage="$3"
  mkdir -p "$stage/$name"
  git -C "$src" ls-files -z |
    tar -C "$src" --null -T - -cf - |
    tar -C "$stage/$name" -xf -
}

build_package() {
  local name="$1" src="$2" version="$3" out="$4"
  local zip="$out/$name-$version.zip"
  local stage="$WORK_DIR/build-$name"
  require_committed "$src"
  stage_package "$name" "$src" "$stage"
  reject_lfs_pointers "$stage/$name"
  rm -f "$zip"
  (cd "$stage" && zip -qrX "$zip" "$name")
  echo "built $zip"
}

# The zip must hold <name>/ and, inside it, exactly the tracked files.
verify_file_list() {
  local zip="$1" name="$2" src="$3" extract="$4"
  [ "$(ls -A "$extract")" = "$name" ] ||
    fail "$zip: expected a single top-level directory '$name/'"
  diff <(git -C "$src" ls-files | sort) \
    <(cd "$extract/$name" && find . -type f | sed 's#^\./##' | sort) >&2 ||
    fail "$zip: file list differs from $src (< repository, > zip)"
}

verify_contents() {
  local zip="$1" name="$2" src="$3" extract="$4" file
  while IFS= read -r -d '' file; do
    cmp -s "$src/$file" "$extract/$name/$file" ||
      fail "$zip: $file differs from $src/$file"
  done < <(git -C "$src" ls-files -z)
  reject_lfs_pointers "$extract/$name"
}

verify_package() {
  local name="$1" src="$2" version="$3" out="$4"
  local zip="$out/$name-$version.zip"
  local extract="$WORK_DIR/verify-$name"
  [ -f "$zip" ] || fail "missing $zip"
  require_committed "$src"
  mkdir -p "$extract"
  unzip -q "$zip" -d "$extract"
  verify_file_list "$zip" "$name" "$src" "$extract"
  verify_contents "$zip" "$name" "$src" "$extract"
  echo "verified $zip"
}

for_each_package() {
  local action="$1" name src
  shift
  while read -r name src <&3; do
    "$action" "$name" "$src" "$@"
  done 3< <(packages)
}

main() {
  [ $# -eq 3 ] || fail "usage: $0 build|verify <version> <out-dir>"
  local command="$1" version="$2" out="$3"
  [[ "$version" =~ ^[A-Za-z0-9._-]+$ ]] ||
    fail "version '$version' may only contain letters, digits, '.', '_', '-'"
  mkdir -p "$out"
  out=$(cd "$out" && pwd)
  cd "$(git rev-parse --show-toplevel)"
  case "$command" in
    build) for_each_package build_package "$version" "$out" ;;
    verify) for_each_package verify_package "$version" "$out" ;;
    *) fail "unknown command '$command'" ;;
  esac
}

main "$@"
