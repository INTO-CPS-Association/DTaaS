# Workspace

This page provides a screenshot-driven preview of the website serving
the workspace software platform.
A quick screen recording is available as well.

![DTaaS user view](../workspace_web.gif)

The user workspace in DTaaS is a personal Linux environment
provided to each registered user.
The `https://intocps.org` is used in this page as an illustration
for base URL of the installation. Do replace it with
the correct URL of the installation.

## Visit the Workspace Installation

> **URL**: `https://intocps.org` (specified in `config/client.js` file)

Navigation begins by visiting the website
of the DTaaS instance for which the user is registered.

![Visit the URL](images/workspace-logo.png)

## Redirected to Authorization Provider

> **URL**: `https://intocps.org/auth/realms/dtaas/xxxx`
> (specified in `config/.env` file)

The browser redirects to the Keycloak
Authorization page for the DTaaS Workspace.

![Workspace Sign on](images/workspace-login.png)

The email/username and password should be entered.

The browser redirects to the Application page.

After successful authentication, redirection to the login page
of the DTaaS website occurs.

> **URL**: `https://intocps.org`

The DTaaS website employs
an additional layer of security -
the third-party authorization
protocol known as
[OIDC](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce).
This protocol provides secure access to a DTaaS
installation for users with active accounts at the selected OIDC
service provider. This implementation also uses Keycloak as the OIDC provider.

After successful authorization, redirection to the **Library**
page of the DTaaS website occurs.

> **URL**: `https://intocps.org/library/xxxx`

Three icons are located on the top-right of the webpage. The hyperlink on
the :question: icon redirects to the help page, while the hyperlink on
the **github icon** redirects to the GitHub code repository.
The **Account** using the top-right purple 🅰️ icon provides options to
[change settings](settings.md) and logout.

## Menu Items

The menu is hidden by default. Only the icons of menu items are visible.
Clicking on the **three horizontal bars** icon in the top-left corner
of the page reveals the menu.

![Menu](images/menu.png)

Three menu items are available:

**Library**: For management of reusable library assets. Files can be uploaded,
downloaded, created, and modified on this page.

**Digital Twins**: For management of digital twins. A Jupyter Lab page is presented
from which digital twins can be executed.

**Workbench**: Not all digital twins can be managed within Jupyter Lab.
Additional tools are available on this page.

## Library Page

![Menu](images/library.png)

Five tabs are displayed, each corresponding to one type of digital twin asset.
Each tab provides help text to guide users on the asset type.

??? tip "Functions"
    The functions responsible for pre- and post-processing of: data inputs,
    data outputs, control outputs. The data science libraries and functions
    can be used to create useful function assets for the platform.
    In some cases, Digital Twin models require calibration prior to their use;
    functions written by domain experts along with right data inputs can make
    model calibration an achievable goal. Another use of functions is to process
    the sensor and actuator data of both Physical Twins and Digital Twins.

??? tip "Data"
    The data sources and sinks available to a digital twins. Typical examples
    of data sources are sensor measurements from  Physical Twins, and
    test data provided by manufacturers for calibration of models.
    Typical examples of data sinks are visualisation software, external users
    and data storage services. There exist special outputs
    such as events, and
    commands which are akin to control outputs from a Digital Twin.
    These control outputs usually go to Physical Twins, but they can also
    go to another Digital Twin.

??? tip "Models"
    The model assets are used to describe different aspects of Physical Twins
    and their environment, at different levels of abstraction. Therefore,
    it is possible to have multiple models for the same Physical Twin.
    For example, a flexible robot used in a car production plant may have
    structural model(s) which will be useful in tracking
    the wear and tear
    of parts. The same robot can have a behavioural model(s) describing
    the safety guarantees provided by the robot manufacturer. The same robot
    can also have a functional model(s) describing the part manufacturing
    capabilities of the robot.

??? tip "Tools"
    The software tool assets are software used to create, evaluate and
    analyse models. These tools are executed on top of a computing
    platforms, i.e., an operating system, or virtual machines like
    Java virtual machine, or inside docker containers. The tools tend
    to be platform specific, making them less reusable than models.
    A tool can be packaged to run on a local or distributed virtual machine
    environments thus allowing selection of most suitable execution
    environment for a Digital Twin.
    Most models require tools to evaluate them in the context of data inputs.
    There exist cases where executable packages are run as binaries in
    a computing environment. Each of these packages are a pre-packaged
    combination of models and tools put together to create a ready to
    use Digital Twins.

??? tip "Digital Twins"
    These are ready to use digital twins created by one or more users.
    These digital twins can be reconfigured later for specific use cases.

Two sub-tabs exist: **private** and **common**. Library assets
in the private category are visible only to the logged-in user, while library
assets in the common category are available to all users.

Further explanation on the placement of reusable assets within each type
and the underlying directory structure on the server
is available on the [assets page](../servers/lib/assets.md#file-system-structure).

!!! note
    Assets (files) can be uploaded using the **upload** button.

:fontawesome-solid-circle-info: The file manager is based on Jupyter Notebook,
and all tasks available in Jupyter Notebook can be
performed here.

## Digital Twins Page

> **URL**: `https://intocps.org/digitaltwins`

![Menu](images/digital_twins.png)

The digital twins page contains three tabs, and the central pane opens Jupyter Lab.
The three tabs provide helpful instructions on suggested tasks for the
**Create - Execute - Analyze** lifecycle phases of
a digital twin. More explanation is available on
the [lifecycle phases of digital twin](../digital-twins/lifecycle.md).

??? tip Create
    Create digital twins from tools provided within user workspaces.
    Each digital twin will have one directory. It is suggested that user
    provide one bash shell script to run their digital twin. Users can
    create the required scripts and other files from tools provided in
    Workbench page.

???  tip Execute
    Digital twins are executed from within user workspaces. The given
    bash script gets executed from digital twin directory. Terminal-based
    digital twins can be executed from VSCode and graphical digital twins
    can be executed from VNC GUI. The results of execution can be placed
    in the data directory.

??? tip Analyze
    The analysis of digital twins requires running
    of digital twin script from user workspace.
    The execution results placed within data directory
    are processed by analysis scripts and results are placed
    back in the data directory. These scripts can either be
    executed from VSCode and graphical results or can be
    executed from VNC GUI.

:fontawesome-solid-circle-info: The reusable assets (files) displayed in
the file manager are also available in Jupyter Lab. Additionally, a
git plugin is installed in Jupyter Lab that enables linking
files with external git repositories.

## Workbench

> **URL**: `https://intocps.org/workbench`

The **Workbench** page provides links to four integrated tools:

| Tool             | Description                                         |
| :--------------- | :-------------------------------------------------- |
| Desktop          | XFCE-based Linux desktop environment in the browser |
| VS Code          | Browser-based VS Code editor (code-server)          |
| Jupyter Lab      | Interactive notebook environment                    |
| Jupyter Notebook | Classic Jupyter interface                           |

![Workbench](images/workspace-workbench.png)

Screenshots of the pages opened by clicking on first four icons are shown:

![Workbench Tools](images/workbench_tools.png)

The hyperlinks open in new browser tabs.

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

## Workspace File System

Each user's workspace container mounts two directories:

```text
/workspace/           # Private user files (read-write)
├── data/
├── digital_twins/
├── functions/
├── models/
└── tools/

/workspace/common/    # Shared library assets
├── data/
├── digital_twins/
├── functions/
├── models/
└── tools/
```

Files in `/workspace/` are private to each user.
Files in `/workspace/common/` are shared across all users.
Administrators can optionally mount `/workspace/common` as read-only via the
compose configuration.

## Installing Software

Users can install additional software inside their workspace
(XFCE Desktop / Jupyter Lab / VSCode):

```bash
sudo apt-get install <package>
pip install <package>
```

Installed software is private to each user's workspace and persists
across sessions.

## Running Digital Twins

Digital twins stored in `/workspace/digital_twins/` can be
executed by running their lifecycle scripts directly in the terminal:

```bash
cd /workspace/digital_twins/<dt-name>
lifecycle/create
lifecycle/execute
```

## Summary

The DTaaS workspace gives each user a private, persistent Linux
environment with browser-based access to a desktop, terminal, and
development tools. Users can install software, run digital twins, and
develop new DT assets within their workspace.
