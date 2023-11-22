TOP_DIR="$(pwd)"

# # setup
# printf "Setting up...\n\n"
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

# # install
# printf "Installing...\n\n"
# pip install pre-commit
# pre-commit autoupdate
# pre-commit install

# dummy
printf "Creating dummy files...\n\n"
echo "const dummy = 'Hello, client!';" > client/dummy.ts
echo "const dummy = 'Hello, runner!';" > servers/execution/runner/dummy.ts
echo "const dummy = 'Hello, lib!';" > servers/lib/dummy.ts

# test
printf "Testing...\n\n"
git add .
git commit -m "test git hooks"
git add .
git push

# remove
printf "Removing dummy files...\n\n"
rm -f client/dummy.ts
rm -f servers/execution/runner/dummy.ts
rm -f servers/lib/dummy.ts

