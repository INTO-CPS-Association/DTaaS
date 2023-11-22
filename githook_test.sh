###### 1. Test all hooks pass

# printf "Testing all hooks pass...\n\n"

# printf "Creating dummy files...\n\n"
# echo "const dummy = 'Hello, client';" > client/dummy.ts
# echo "// const dummy = 'Hello, runner'; var a = dummy;" > servers/execution/runner/dummy.js
# echo "# Hello, lib" > servers/lib/dummy.md

# printf "Staging changes...\n\n"
# git add .
# printf "Pre-commit stage...\n\n"
# git commit -m "test git hooks" -q
# printf "\nPre-push stage...\n\n"
# git push -q

###### 2. Test prettier hook fail

# printf "Testing prettier hook fail...\n\n"

# printf "Creating dummy files...\n\n"
# echo "const dummy   = 'Hello, client';" > client/dummy.ts

# printf "Staging changes...\n\n"
# git add .
# printf "Pre-commit stage...\n\n"
# git commit -m "test git hooks" -q
# git reset -q

###### 3. Test eslint hook fail

# print "Testing eslint hook fail...\n\n"

# printf "Creating dummy files...\n\n"
# echo "const dummy = 'Hello, runner';" > servers/execution/runner/dummy.js

# printf "Staging changes...\n\n"
# git add .
# printf "Pre-commit stage...\n\n"
# git commit -m "test git hooks" -q
# git reset -q

###### 4. Test markdownlint hook fail

printf "Testing markdownlint hoot...\n\n"

printf "Creating dummy files...\n\n"
echo " Hello, lib" > servers/lib/dummy.md

printf "Staging changes...\n\n"
git add .
printf "Pre-commit stage...\n\n"
git commit -m "test git hooks" -q
git reset -q

###### Clean up after each test

rm -f client/dummy.ts
rm -f servers/execution/runner/dummy.js
rm -f servers/lib/dummy.md

git add .
git commit -m "reset after test" -q
git push -q