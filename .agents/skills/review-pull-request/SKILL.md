---
name: review-pull-request
description: Check whether a DTaaS pull request passes its merge gates (GitHub Actions, Qlty, SonarQube and Copilot review comments) and report READY TO MERGE or BLOCKED. Use when asked to review this PR, check a pull request or branch, or say whether a PR is ready to merge.
license: INTO-CPS Association Public License, in LICENSE.md at the repository root
compatibility: Requires the GitHub CLI (gh) authenticated against the repository.
---

# Review a pull request

## Role

Act as a senior engineer responsible for verifying that a pull request
meets all quality gates before it is eligible for merge.

## Inputs

- **Branch name**: the feature or fix branch under review.
- **PR number** (optional): the GitHub pull request number, if available.

## Procedure

Work through the following checks in order. Do not mark the PR as ready
unless every check passes.

### 1. GitHub Actions

Retrieve the current CI status for the branch.

```bash
gh pr checks <PR-number>
```

If the PR number is not available, check by branch name:

```bash
gh run list --branch <branch-name> --limit 20
```

Expected outcome: all workflow runs must report a `completed` status
with conclusion `success`. Identify any failing runs by name and provide
the URL to the run log.

The following workflows are relevant to DTaaS. Most also run when their
own file in `.github/workflows/` changes; the `on:` block of each file is
the authority on its trigger paths.

| Workflow | Trigger paths |
| :--- | :--- |
| React website | `client/**` |
| CLI for DTaaS | `cli/**`, `lib/**` |
| Platform Services CLI | `deploy/services/cli/**`, `lib/**` |
| gitlab-common library | `lib/gitlab_common/**` |
| DT automation npm package | `lib/dt-automation/**` |
| Digital twin runner | `servers/execution/**` |
| Library microservice | `servers/lib/**` |
| Logger microservice | `servers/logger/**` |
| Release Packages | `deploy/dtaas/**`, `deploy/workspace/**` |
| Build documentation | `docs/**` |
| Lint Miscellaneous Scripts | `**.sh`, `**.py`, `**.yml`, `**.yaml`, `.agents/skills/**`, `.claude/skills/**` |
| Qlty | every pull request |

### 2. qlty

Check the qlty code quality report for the PR.

Navigate to the qlty dashboard for the repository and locate the
report for the branch or PR. Verify:

- No new issues have been introduced that block the quality gate.
- The overall quality score has not regressed relative to the base
  branch.

On a pull request from a fork, Qlty Cloud reports a skipped analysis;
that is expected. Read the `Qlty` workflow's job log and summary
instead (see "Pull request checks" in `PROJECT.md`).

If the qlty CLI is installed, run:

```bash
qlty check --all
```

Report any blocking issues with file path, line number, and rule
identifier.

### 3. SonarQube

Check the SonarQube analysis report for the PR.

Locate the SonarQube project for this repository and review the
quality gate result for the branch. Verify:

- Quality gate status is `Passed`.
- No new bugs, vulnerabilities, or security hotspots have been
  introduced.
- Code coverage has not dropped below the configured threshold.
- Duplication percentage has not increased beyond the configured
  threshold.

Report any quality gate failures with the metric name, current value,
and the required threshold.

### 4. GitHub Copilot review comments

Retrieve any automated review comments posted by GitHub Copilot on
the PR.

```bash
gh api repos/{owner}/{repo}/pulls/<PR-number>/reviews \
  --jq '.[] | select(.user.login == "copilot-pull-request-reviewer") |
        {state, body}'
gh api repos/{owner}/{repo}/pulls/<PR-number>/comments \
  --jq '.[] | select(.user.login | startswith("copilot")) |
        {path, line, body}'
```

For each Copilot comment:

1. Identify whether it is a blocking concern or a suggestion.
2. Determine whether the concern has already been addressed in the
   code.
3. If the concern is unaddressed and blocking, list it in the final
   report.

### 5. Final report

Produce a structured summary with the following sections:

#### GitHub Actions

State `PASS` or `FAIL` for each relevant workflow. List any failing
workflow names and their run URLs.

#### qlty

State `PASS` or `FAIL`. List any blocking issues.

#### SonarQube

State `PASS` or `FAIL`. List any quality gate failures with metric
details.

#### Copilot review

State `PASS` or `FAIL`. List any unaddressed blocking comments with
the file path and line number.

#### Overall status

State one of:

- **READY TO MERGE**: all checks pass.
- **BLOCKED**: list the checks that have failed and the actions
  required to resolve them.

## Escalation

If any automated check cannot be retrieved (for example, due to
missing credentials or tool unavailability), report the check as
`UNKNOWN` and note the reason. Do not mark the PR as ready when any
check is `UNKNOWN`.
