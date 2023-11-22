# 1. test all hooks pass
printf "Creating dummy files...\n\n"
echo "const dummy = 'Hello, client';" > client/dummy.ts
echo "const dummy = 'Hello, runner';" > servers/execution/runner/dummy.js
echo "# Hello, lib" > servers/lib/dummy.md

printf "Testing all hooks pass...\n\n"
git add .
git commit -m "test git hooks"
git push

# 2. test prettier hook fail
# printf "Creating dummy files...\n\n"
# echo "const dummy   = 'Hello, client';" > client/dummy.ts

# printf "Testing...\n\n"
# git add .
# git commit -m "test prettier hooks"
# git reset

# 3. test eslint hook fail
# printf "Creating dummy files...\n\n"
# echo "const dummy = 'Hello, runner';" > servers/execution/runner/dummy.js

# printf "Testing eslint hook fail...\n\n"
# git add .
# git commit -m "test eslint hook"
# git reset

# 4. test markdownlint hook fail
# printf "Creating dummy files...\n\n"
# echo " Hello, lib" > servers/lib/dummy.md

# printf "Testing markdownlint hoot...\n\n"
# git add .
# git commit -m "test markdownlint hook"
# git reset

# clean up after each test
printf "Removing dummy files...\n\n"
rm -f client/dummy.ts
rm -f servers/execution/runner/dummy.js
rm -f servers/lib/dummy.md

printf "Resetting...\n\n"
git add .
git commit -m "reset after test"
git push