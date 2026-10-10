@echo off
rem Windows counterpart of init.sh, for hosts without a POSIX shell.
rem The devcontainer falls back to it when 'sh' is not on PATH. It is
rem safe to run again.
setlocal
set "devenv_dir=%~dp0"
set "repo_dir=%~dp0..\.."

rem Docker Desktop does not map host ids onto bind mounts, so the
rem image only needs a regular non-root user. An existing .env is left
rem alone to preserve port overrides.
if not exist "%devenv_dir%.env" (
  > "%devenv_dir%.env" (
    echo UID=1000
    echo GID=1000
  )
)

rem Create the node_modules mount points, as init.sh does.
for %%p in (client servers\lib servers\logger lib\dt-automation) do (
  if not exist "%repo_dir%\%%p\node_modules" mkdir "%repo_dir%\%%p\node_modules"
)
exit /b 0
