---
name: technical-debt-remediation-plan
description: Analyse code, tests and documentation for technical debt and write a remediation plan rated by ease, impact and risk, without changing code. Use when asked for a technical debt plan, a tech debt assessment, or a prioritised list of cleanup or refactoring work.
license: MIT
metadata:
  source: "https://github.com/github/awesome-copilot"
---

# Technical Debt Remediation Plan

Generate comprehensive technical debt remediation plans. Analysis only -
no code modifications. Keep recommendations concise and actionable. Do
not provide verbose explanations or unnecessary details.

## Analysis Framework

Create Markdown document with required sections:

### Core Metrics (1-5 scale)

- **Ease of Remediation**: Implementation difficulty (1=trivial, 5=complex)
- **Impact**: Effect on codebase quality (1=minimal, 5=critical)
- **Risk**: Consequence of inaction (1=negligible, 5=severe)

Use icons for visual impact on the Impact and Risk ratings:

- 🟢 Low
- 🟡 Medium
- 🔴 High

### Required Sections

- **Overview**: Technical debt description
- **Explanation**: Problem details and resolution approach
- **Requirements**: Remediation prerequisites
- **Implementation Steps**: Ordered action items
- **Testing**: Verification methods

## Common Technical Debt Types

- Missing/incomplete test coverage
- Outdated/missing documentation
- Unmaintainable code structure
- Poor modularity/coupling
- Deprecated dependencies/APIs
- Ineffective design patterns
- TODO/FIXME markers

## Output Format

1. **Summary Table**: Overview, Ease, Impact, Risk, Explanation
2. **Detailed Plan**: All required sections

## GitHub Integration

- Search existing issues (for example `gh issue list --search <terms>`)
  before creating new issues
- Use the closest template in `.github/ISSUE_TEMPLATE/` for remediation
  tasks; it holds `bug_report.md` and `feature_request.md`
- Reference existing issues when relevant
