# Known Issues in the Software

If a bug is discovered,
[an issue should be opened](https://github.com/INTO-CPS-Association/DTaaS/issues/new)

## Third-Party Software

The explanation given below corresponds to bugs that may be encountered
from third party software included in the DTaaS platform.
Known issues are listed below.

## GitLab

The GitLab OAuth 2.0 authorization service does not
have a way to sign out of a third-party application.
Even if a user signs out of the DTaaS platform, GitLab still shows the user
as signed in.
The next time the sign in button is clicked on the the DTaaS platform page,
the login page is not displayed.
Instead the user is directly taken to the **Library** page.
Therefore, the browser window should be closed after use.
Another way to overcome this limitation is to open the
GitLab instance (`https://gitlab.foo.com`) and sign out from there.
Thus the user needs to sign out of two places, namely the DTaaS platform and GitLab,
in order to completely exit the the DTaaS platform.
