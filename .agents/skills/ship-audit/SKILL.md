---
name: ship-audit
description: Audit a change before it is committed, pushed or offered for review, and report each gate with the evidence that proves it. Checks that the project's tests and linters pass, that nothing is hardcoded (credentials, user names, hosts, colours), that nothing is duplicated or left dead, that new dependencies are old enough and safe, that documentation matches the code, and that every earlier review point is answered. Use before opening a pull request, before asking a maintainer to review, before a force push to a branch with an open pull request, or when asked whether a change is ready to ship.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires git, the toolchains listed in PROJECT.md for the components the change touches, and the GitHub CLI (gh) for the pull request gates.
---

# Ship audit

Run every gate below in order and report each one with the evidence that
produced it. A gate that was not run is reported as not run, never as
passed. The rules come from `AGENTS.md` and `PROJECT.md`. This skill only
fixes the order in which they are checked and what counts as evidence.

`review-pull-request` checks the merge gates of a pull request that is
already open. This skill runs earlier, on the branch, so the findings are
fixed before a reviewer spends time on them. The commands are written for
a POSIX shell: Linux, macOS, or Git Bash on Windows.

## Rule zero: scope the audit to the diff

Find the base first. The upstream remote is the one pointing at
`github.com/INTO-CPS-Association/DTaaS`, whatever its name. The target is
`TARGET_BRANCH`, else the open pull request's base, else the default branch.

```bash
remote=$(git remote -v | grep -iE 'github\.com[:/]into-cps-association/dtaas(\.git)? ' | awk '{ print $1; exit }')
git fetch "$remote"
target=${TARGET_BRANCH:-$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || git remote show "$remote" | sed -n 's/.*HEAD branch: //p')}
base=$(git merge-base HEAD "$remote/$target")
git diff --name-only "$base"..HEAD
```

Then run the pre-commit hooks over the whole branch:

```bash
pre-commit run --from-ref "$base" --to-ref HEAD
pre-commit run --hook-stage pre-push --from-ref "$base" --to-ref HEAD
```

The first runs the linters, gitleaks and the file checks on every changed
file, the second the test suites of the touched components. The gates
below quote their output and do by hand only what no hook checks.

Every finding is traced to a file in that list. A hit in a file the change
does not touch belongs to the base branch: report it as context and leave
it alone, as `PROJECT.md` asks under "Verifying a change". Never truncate
`git status` or `git diff --name-only` with `head`, because a deletion
below the cut is a deletion nobody explains.

A code example inside a Markdown file is not an import, so read the
line's context before calling it a dependency.

## Gate 1: everything works

Use the commands in the "Build and test commands" table of `PROJECT.md`
for every component the change touches. A command assembled by hand uses
a different configuration and produces failures that do not exist. In
`client`, the unit and integration suites run separately, each with its
own setup file.

Report the counts: suites passed and tests passed, per component. Run the
same command at the merge base when a count drops, and compare.

A single-page application answers HTTP 200 for every path, so verify a
route by a string only that page renders.

## Gate 2: what the change deletes or moves

A file that stops existing takes every reference to it with it. Before a
file is removed or renamed, search the tracked files for its name, which
skips `node_modules` and build output on every platform:

```bash
git grep -n "<basename>"
```

Build scripts, CI workflows, `mkdocs.yml` and the publish scripts are
where a stale reference hides, because none of them fails a test.

## Gate 3: nothing hardcoded

Credentials and user names come first.

- No password, token, key, client secret or connection string in the
  source, a test, a fixture, a comment, a commit message or the pull
  request description. Test values are visibly fake, such as
  `test-password`, and never a value copied from a real installation.
- No personal user name, e-mail address, home directory or machine path
  (`/home/<name>`, `/Users/<name>`, `C:\Users\<name>`). Examples use
  placeholders such as `<username>` or `user1`.
- No host, port or URL of a real installation outside the configuration
  files that own it. Each one comes from an environment variable or from
  the one module that owns it, with the variable documented.
- An `.env` file is read by its variable names only, never by its values:
  `sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env`.

Search the added lines, not the whole repository:

```bash
git diff -U0 "$base"..HEAD | grep '^+' | grep -inE \
  'password|passwd|secret|token|api[_-]?key|/home/|/Users/|@[a-z0-9-]+\.[a-z]{2,}'
```

Read every hit next to the gitleaks result. A placeholder is fine. A
value is a finding, and a pushed value is a secret to rotate.

The configuration templates in `references/config_exceptions.json` carry
dummy credentials on purpose, so a hit there is expected while the value
stays a visible placeholder or a documented default. A new template with
credentials joins that list in the same change.

Colours, radii, spacing and shadows in the client come from the theme,
so a colour literal outside the theme files is a finding:

```bash
git diff -U0 "$base"..HEAD -- client/src | grep '^+' | \
  grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\('
```

## Gate 4: nothing extra and nothing duplicated

- No file with a suffix invented for the change (`.new`, `.v2`, `.backup`,
  `.old`). The change lives in the project's own files.
- No function, constant or comment that repeats one that already exists.
  Search for the name before adding it.
- No export that nothing imports, no import that nothing uses.
- No duplicated line in a commit message or the pull request description,
  which is what successive amends produce.

## Gate 5: code standards

- The linters and formatters of `PROJECT.md` under "Code standards" pass
  on every touched file. The pre-commit run covers eslint, prettier,
  markdownlint and shellcheck. Run `.pylintrc` and `.yamllint.yml` by hand.
- Functions stay within the size limit of `AGENTS.md`.
- Comments explain why, not what. A file where most lines are comments is
  explaining the obvious.
- One responsibility per new module: say what it does in one sentence.
  Two sentences joined by "and" mean it does two things.
- The lower layer imports nothing from the layer above it.
- No commit message credits a coding tool as author. The `commit-msg`
  hook in `.pre-commit-config.yaml` refuses those trailers, and
  `docs/developer/contributions/coding-agents.md` says where agent use is
  disclosed instead.

## Gate 6: interface

Only when the change touches the client's interface.

- Layout in relative units, with no fixed pixel width on a container.
- Interactive controls at least 44 pixels on their smallest side.
- Contrast of 4.5:1 for body text and 3:1 for large text.
- A visible focus ring and reduced motion respected.
- Every page, image and diagram the change touches checked in the light
  and the dark theme. A screenshot of each theme is the evidence.
- Accessibility asserted by role through Testing Library or Playwright.
  `getByRole('link')` matches an anchor, while the selector
  `a[role="link"]` matches nothing, because the role is implicit.

## Gate 7: known vulnerabilities

Compare against the base, so advisories that already exist are not
reported as new:

1. In a worktree at the merge base, run `yarn audit` (or `npm audit`) for
   each touched component and record the totals by severity.
2. Run the same command at `HEAD` and record the totals again.
3. Report the difference. A new advisory is named with the package and
   the path that pulls it in.

## Gate 8: supply chain

For every dependency the change adds or bumps, including CI actions and
container images:

- The version is at least ten days old, the cooldown that the
  `upgrade-npm-packages` skill enforces. `npm view <pkg>@<version> time`
  gives the publish date.
- The integrity hash in the lockfile matches the one the registry serves.
- The package belongs to the organisation it claims, and the name is not
  one letter away from a popular package.
- `npm view <pkg>@<version> scripts` shows no install script, or the
  script has been read.
- The licence allows distribution under the project's licence.
- A CI action is pinned to a full commit SHA with the version in a
  comment, as the existing workflows do.

The cooldown covers the audit's own tools as well. Run them with a pinned
version and a date bound:
`npx --yes --before=<today minus ten days> <tool>@<version>`.

## Gate 9: generated and binary files

- A generator is run from the directory its README names, and its output
  is opened and looked at. A headless browser given a wrong path writes a
  blank image and exits with status zero.
- Every binary the change adds is stored through Git LFS. The
  `check-added-large-files` hook refuses a large file outside LFS. Check
  each smaller binary before the commit too, because a raw blob in the
  history needs a rewrite to remove:

```bash
git check-attr filter -- <file>
git lfs ls-files | grep -F "<file>"
git cat-file -s "$(git rev-parse HEAD:<file>)"   # a pointer is ~130 bytes
```

## Gate 10: coverage

`codecov/patch` measures the diff and answers whether the change is
tested. `codecov/project` measures the whole repository against the
reports that arrived, so a suite that cannot run on a fork pull request
lowers it without a line changing. Quote the first and explain the second.

For a gap, read the instrumentation instead of guessing from the line
numbers, and sort each uncovered branch into one of three groups:

- In the diff and reachable: write the test.
- In the diff and unreachable, such as an optional chain on a value a
  guard has already rejected: name it and leave it.
- Outside the diff: confirm with `git diff --unified=0 "$base"..HEAD --
  <file>` and leave it.

Never raise the number by mocking the module under test.

## Gate 11: review it as the maintainer will

Read the whole branch against the current tip of its base, the way the
maintainer will: every earlier review point marked done, not done or
open, every Markdown claim checked against the code, the success criteria
of each issue the pull request closes, and every number in its
description. Read the reviews already posted and never trigger a
maintainer's review agent, which runs on their account. Name what has not
been run. `references/maintainer-review.md` has each step in full.

## Report

One table, one row per gate, with the evidence in the row. State the
number that proves it, not an adjective:

| Gate              | Result                                                    |
| :---------------- | :-------------------------------------------------------- |
| Everything works  | client: 998 unit and 136 integration tests, eslint clean  |
| Nothing hardcoded | No credential or personal path in the added lines         |
| Maintainer review | 5 earlier points answered with commits, 2 claims fixed    |

Add anything that failed, anything skipped and anything that belongs to
the base branch. Finish with what is left open and who has to act on it.
