#!/bin/bash

if [ -n "$1" ]; then
  VERSION="$1"
else
  VERSION="development"
fi

export VERSION
TOP_DIR=$(pwd)
export TOP_DIR
COMMIT_HASH=$(git rev-parse --short HEAD)
export COMMIT_HASH
export MKDOCS_ENABLE_PDF_EXPORT=1 

echo "${VERSION}"
if [ -d site ]
then
  rm -rf site
fi

printf "generate and publish documents"
mkdocs build --config-file mkdocs.yml --site-dir "site/online/${VERSION}"

cp docs/redirect-page.html site/index.html

cd "${TOP_DIR}" || exit
git checkout webpage-docs

# If you want to make the current branch into docs branch
# use the following commands to clean up the irrelevant files
# rm -rf client deploy docs files LICENSE.md mkdocs.yml mkdocs_offline.yml README.md servers ssl STATUS.md
# rm -rf .git-hooks/*
# rm script/configure-git-hooks.sh script/grafana.sh script/influx.sh script/install.bash

cd "${TOP_DIR}" || exit
if [ -d "${VERSION}" ]; then
  rm -rf "${VERSION}"
fi

if [ -d "site/online/${VERSION}" ]
then
  cd site/online || exit
  mv "${VERSION}/pdf/DTaaS-docs.pdf" "${TOP_DIR}/DTaaS-${VERSION}.pdf"
  mv "${VERSION}" "${TOP_DIR}/."
fi

cd "${TOP_DIR}" || exit
mv site/index.html .
rm -rf site

git add .
git commit -m "docs for ${COMMIT_HASH} commit"