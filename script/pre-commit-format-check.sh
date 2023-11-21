#!/usr/bin/env sh

printf "Hello"

TOP_DIR="$(pwd)"
export TOP_DIR

format_check() {
    local directory="$1"
    if git diff --cached --name-only | grep "^$directory/" >/dev/null; then
        cd "$directory" || exit
        yarn install
        yarn format && yarn syntax
        printf "Success"
    else
        printf "No changes in the $directory directory. Skipping pre-commit hook.\n\n"
    fi
}

if [ $# -eq 0 ]; then
    echo "Please provide at least one directory as an argument."
    exit 1
fi

for directory in "$@"; do
    format_check "$directory"
done

cd "$TOP_DIR" || exit