export PATH="$(yarn bin):$PATH"
echo "Running eslint"
eslint .

echo "Running jshint"
jshint .