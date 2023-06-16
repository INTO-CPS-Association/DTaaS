
## Third-Party Software

We use third-party software which have certain known issues. Some of the issues are listed below.

### ML Workspace

- the docker container loses network connectivity after three days. The only known solution is to restart the docker container. You don't need to restart the complete DTaaS platform, restart of the docker contaienr of ml-workspace is sufficient.
- the terminal tool doesn't seem to have the ability to refresh itself. If there is an issue, the only solution is to close and reopen the terminal from "open tools" drop down of notebook
- terminal app does not show at all after some time: terminal always comes if it is open from drop-down menu of Jupyter Notebook, but not as a direct link.
