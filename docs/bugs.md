# Few issues in the Software

If you find a bug, please
[open an issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new)

## Third-Party Software

The explanation given below corresponds to the bugs you may face
from third party software included in DTaaS.
Known issues are listed below.

## GitLab

- The gilab oauth authorization service does not
  have a way to sign out of a third-party application.
  Even if you sign out of DTaaS, the GitLab still shows user as signed in.
  The next time you click on the sign in button on the DTaaS page,
  user is not shown the login page.
  Instead user is directly taken to the **Library** page.
  So close the brower window after you are done.
  Another way to overcome this limitation is to open your
  GitLab instance (`https://gitlab.foo.com`) and signout from there.
  Thus user needs to sign out of two places, namely DTaaS and GitLab,
  in order to completely exit the DTaaS application.
