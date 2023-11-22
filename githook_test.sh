TOP_DIR="$(pwd)"

# 1. initial setup for testing
# printf "Cleaning...\n\n"
# cd client
# yarn clean
# cd "$TOP_DIR"

# cd servers/execution/runner
# yarn clean
# cd "$TOP_DIR"

# cd servers/lib
# yarn clean
# cd "$TOP_DIR"

# rm -rf .git/hooks/

# printf "Installing...\n\n"
# pip install pre-commit
# pre-commit autoupdate
# pre-commit install

# 2. test all hooks pass
# printf "Creating dummy files...\n\n"
# echo "const dummy = 'Hello, client';" > client/dummy.ts
# echo "const dummy = 'Hello, runner';" > servers/execution/runner/dummy.js
# echo "# Hello, lib" > servers/lib/dummy.md

# printf "Testing all hooks pass...\n\n"
# git add .
# git commit -m "test git hooks"
# git push

# 3. test prettier hook
# printf "Creating dummy files...\n\n"
# echo "const dummy   = 'Hello, client';" > client/dummy.ts

# printf "Testing...\n\n"
# git add .
# git commit -m "test git hooks"
# git reset

# 4. test eslint hook fail
printf "Creating dummy files...\n\n"
echo "const dummy = 'Hello, runner';" > servers/execution/runner/dummy.js

printf "Testing eslint hook fail...\n\n"
git add .
git commit -m "test git hooks"
git reset

# 5. test markdownlint hook
# # dummy
# printf "Creating dummy files...\n\n"
# echo "Hello, lib!" > servers/lib/dummy.md

# # test
# printf "Testing...\n\n"
# git add .
# git commit -m "test git hooks"
# git reset

# remove
printf "Removing dummy files...\n\n"
rm -f client/dummy.ts
rm -f servers/execution/runner/dummy.js
rm -f servers/lib/dummy.md

# reset
printf "Resetting...\n\n"
git add .
git commit -m "reset after test"
git push