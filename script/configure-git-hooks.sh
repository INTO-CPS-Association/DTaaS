#!/bin/sh

pip install pre-commit
pre-commit install

printf "Git hooks setup successfully. See .git/hooks/ for more information."
