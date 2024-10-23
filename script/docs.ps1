# Get the version
if ($args) {
    $Version = $args[0]
} else {
    $Version = "development"
}

# Set environment variables
$env:VERSION = $Version
$env:COMMIT_HASH = (git rev-parse --short HEAD)
$env:MKDOCS_ENABLE_PDF_EXPORT = 1

Write-Output "Version: $Version"

# Remove the site directory if it exists
if (Test-Path "site") {
    Remove-Item "site" -Recurse -Force
}

# Generate and publish documents
Write-Output "Generate and publish documents..."
& mkdocs build --config-file mkdocs.yml --site-dir "site/online/$Version"

# Copy redirect page
Copy-Item "docs/redirect-page.html" "site/index.html"

# Checkout webpage-docs branch
git checkout webpage-docs

# Clean up irrelevant files
if (Test-Path "$Version") {
    Remove-Item "$Version" -Recurse -Force
}

# Move PDF file to top directory
if (Test-Path "site/online/$Version") {
    Move-Item "site/online/$Version/pdf/DTaaS-docs.pdf" ".\DTaaS-$Version.pdf"
    Move-Item "site/online/$Version" ".\$Version"
}

# Move index.html to top directory and remove site directory
Move-Item "site/index.html" "."
Remove-Item "site" -Recurse -Force

# Commit changes
git add .
git commit --no-verify -m "docs for $env:COMMIT_HASH commit"