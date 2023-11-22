TOP_DIR="$(pwd)"

# clean
cd client
yarn clean
cd "$TOP_DIR"

cd servers/execution/runner
yarn clean
cd "$TOP_DIR"

cd servers/lib
yarn clean
cd "$TOP_DIR"

# dummy
echo "const dummy = 'Hello, client!';" > client/dummy.ts
echo "const dummy = 'Hello, runner!';" > servers/execution/runner/dummy.ts
echo "const dummy = 'Hello, lib!';" > servers/lib/dummy.ts

# install
pip install pre-commit
pre-commit autoupdate
pre-commit install

# test
git add .
git commit -m "test git hooks"
git push

# remove
rm -f client/dummy.ts
rm -f servers/execution/runner/dummy.ts
rm -f servers/lib/dummy.ts

