# Few issues in the Software

## Some limitations

- The complete DTaaS software requires
  multiple docker containers and one client website.
  All of these can work together only on a server with a proper domain name.
  The complete application does not work on localhost.

## Third-Party Software

- We use third-party software which have certain
  known issues. Some of the issues are listed below.

### ML Workspace

- the docker container loses network connectivity after three days. The only known solution is to restart the docker container.
  You don't need to restart the complete DTaaS platform, restart of the docker contaienr of ml-workspace is sufficient.
- the terminal tool doesn't seem to have the ability to refresh itself. If there is an issue, the only solution is to close and
  reopen the terminal from "open tools" drop down of notebook
- terminal app does not show at all after some time: terminal always comes if it is open from drop-down menu of Jupyter Notebook,
  but not as a direct link.

## Gitlab

- The gilab oauth authentication service does not
  have a way to sign out of a third-party application.
  Even if you sign out of DTaaS, the gitlab still shows user as signed in.
  The next time you click on the sign in button on the DTaaS page,
  user is not shown the login page.
  Instead user is directly taken to the **Library** page.
  So close the brower window after you are done.
  Another way to overcome this limitation is to open your
  gitlab instance (`https://gitlab.foo.com`) and signout from there.
  Thus user needs to sign out of two places, namely DTaaS and gitlab,
  in order to completely exit the DTaaS application.
