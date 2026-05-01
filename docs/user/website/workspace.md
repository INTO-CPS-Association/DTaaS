# Workspace

The user workspace in DTaaS is a personal Linux environment
provided to each registered user. It is built on top of
[code-server](https://github.com/coder/code-server) and an XFCE
desktop, giving access to a full Linux development environment from
the browser.

## Accessing the Workspace

> **URL**: `https://intocps.org/workbench`

Navigate to the **Workbench** page and click the **Desktop** or
**VS Code** icon to open the workspace.

![Workbench](images/workbench.png)

## Workspace Tools

The **Workbench** page provides links to six integrated tools:

| Tool | Description |
| :--- | :--- |
| Desktop | XFCE-based Linux desktop environment in the browser |
| VS Code | Browser-based VS Code editor (code-server) |
| Jupyter Lab | Interactive notebook environment |
| Jupyter Notebook | Classic Jupyter interface |
| Library Preview | Preview and compose assets from the common library |
| Digital Twins Preview | Manage and execute digital twins using DevOps |

![Workbench Tools](images/workbench_tools.png)

## Workspace File System

Each user's workspace container mounts two directories:

```text
/workspace/           # Private user files (read-write)
├── data/
├── digital_twins/
├── functions/
├── models/
└── tools/

/workspace/common/    # Shared library assets (read-only)
├── data/
├── digital_twins/
├── functions/
├── models/
└── tools/
```

Files in `/workspace/` are private to each user.
Files in `/workspace/common/` are read-only and shared across all users.

## Installing Software

Users can install additional software inside their workspace:

```bash
sudo apt-get install <package>
pip install <package>
```

Installed software is private to each user's workspace and persists
across sessions.

## Running Digital Twins

Digital twins stored in `/workspace/username/digital_twins/` can be
executed by running their lifecycle scripts directly in the terminal:

```bash
cd /workspace/digital_twins/<dt-name>
lifecycle/create
lifecycle/execute
```

For automated execution using GitLab CI/CD pipelines, see the
[DevOps UI](../digital-twins/devops/ui.md) documentation.

## VS Code Workspace

The VS Code interface provides:

- File explorer for navigating the workspace
- Integrated terminal for running commands
- Extensions for Python, Markdown, and other languages

![VS Code](images/vscode.png)

## XFCE Desktop

The XFCE desktop provides a full graphical Linux environment accessible
from the browser. This is useful for running GUI-based tools that cannot
be used from a terminal alone.

![XFCE Desktop](images/xfce-desktop.png)

## Summary

The DTaaS workspace gives each user a private, persistent Linux
environment with browser-based access to a desktop, terminal, and
development tools. Users can install software, run digital twins, and
develop new DT assets within their workspace.
