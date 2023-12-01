#!/bin/bash

# This script is used by the pre-commit hook to check the markdown files without exiting the commit process.
output=$(markdownlint "$@")
echo "$output"
exit 0