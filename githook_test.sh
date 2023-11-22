# 1. test all hooks pass
printf "Testing all hooks pass...\n\n"

printf "Creating dummy files...\n\n"
echo "const dummy = 'Hello, client';" > client/dummy.ts
echo "// const dummy = 'Hello, runner'; var a = dummy;" > servers/execution/runner/dummy.js
echo "# Hello, lib" > servers/lib/dummy.md

printf "Staging changes...\n\n"

git add .
printf "Pre-commit stage...\n\n"
git commit -m "test git hooks" -q
printf "\nPre-push stage...\n\n"
git push -q

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

# Reset after each test
printf "Resetting...\n\n"
git reset --hard HEAD~1