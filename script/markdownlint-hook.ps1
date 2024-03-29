# This script is used by the pre-commit hook to check the markdown files without exiting the commit process.

# Invoke markdownlint and capture the output
$output = markdownlint $args

# Print the output
Write-Output $output

# Exit with code 0 to indicate success
Exit 0