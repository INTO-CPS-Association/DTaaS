# Coding Agents

Coding agents read their instructions from files in the repository. Every
agent reads the same files, so the rules are written once.

## Instruction files

| File                              | Holds                                                                                                            | Read by                                               |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| `AGENTS.md`                       | General coding guidelines                                                                                        | Codex, OpenCode, GitHub Copilot and most other agents |
| `PROJECT.md`                      | Build and test commands, verification, shipping, pull request checks, code standards and per-project conventions | Every agent, through `AGENTS.md`                      |
| `CLAUDE.md`                       | Imports `AGENTS.md` and `PROJECT.md`                                                                             | Claude Code                                           |
| `.github/copilot-instructions.md` | A pointer to `AGENTS.md` and `PROJECT.md`                                                                        | GitHub Copilot                                        |

Change the rules in `AGENTS.md` or `PROJECT.md`; the other files only
point to them.

## Skills

Task-specific instructions are
[Agent Skills](https://agentskills.io). Each skill is a directory
`.agents/skills/<name>/` holding a `SKILL.md` file and, where needed,
scripts. Codex and OpenCode find skills in `.agents/skills/`.

Claude Code reads skills from `.claude/skills/` only. Each skill
therefore has a stub `.claude/skills/<name>/SKILL.md` with the same
frontmatter, whose body sends the agent to the canonical file. A
symbolic link would check out as a plain file on Windows clones without
symlink support. The `Lint Miscellaneous Scripts` workflow fails when a
stub's frontmatter differs from its canonical skill.

The repository provides these skills:

| Skill                             | Use it to                                                                                              |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `upgrade-npm-packages`            | Upgrade npm dependencies behind a ten-day release cooldown; see [Upgrade NPM Packages](npm-upgrade.md) |
| `capture-docs-screenshots`        | Retake the user documentation screenshots from a running installation                                  |
| `update-docs-diagrams`            | Edit, restyle and export the documentation diagrams                                                    |
| `review-pull-request`             | Check that a pull request passes every quality gate before merge                                       |
| `ship-audit`                      | Audit a branch, with evidence for each gate, before it is offered for review                           |
| `check-code-quality`              | Review the code quality of one component                                                               |
| `plan-before-coding`              | Analyse the codebase and requirements before implementing                                              |
| `architecture-design`             | Design an architecture and its diagrams and documentation                                              |
| `react-frontend-engineer`         | Work on the React client                                                                               |
| `playwright-tester`               | Explore the website and write Playwright tests                                                         |
| `technical-debt-remediation-plan` | Plan the remediation of technical debt                                                                 |
| `critical-thinking`               | Challenge assumptions behind a proposed solution                                                       |
| `mentor`                          | Guide an engineer rather than writing the code for them                                                |

Seven of these skills are adapted from
[awesome-copilot](https://github.com/github/awesome-copilot) under the MIT
licence; see `.github/REFERENCES.md`.

### Adding a skill

1. Create `.agents/skills/<name>/SKILL.md`. Its frontmatter needs `name`,
   equal to the directory name, and a `description` that says what the
   skill does and when to use it. The agent decides whether to load the
   skill from the description alone.
1. Create `.claude/skills/<name>/SKILL.md` with the same frontmatter and a
   body that points to the canonical file.
1. Add the skill to the table above.
1. Validate both directories with
   [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref):
   `skills-ref validate .agents/skills/<name>`.

## Using coding agents

Contributors use coding agents for co-development, code review and draft
pull requests. Disclose code that a coding agent generated, particularly
when it carries significant program logic. Understand every line you
contribute: review generated code before submitting it, and keep the
critical thinking for yourself.

Commits name people only. The `no-tool-attribution` hook in
`.pre-commit-config.yaml` runs at the `commit-msg` stage and refuses a
message that credits a coding tool as co-author, for example a
`Co-Authored-By` trailer that names one. `pre-commit install` installs it
together with the other hooks. Disclose agent use in the pull request
description instead.
