# Known Issues in the Software

If you find a bug, please
[open an issue](https://github.com/INTO-CPS-Association/DTaaS/issues/new).

## Third-Party Software

Some known issues come from third-party software included in the DTaaS
platform. They are listed below.

## GitLab

The GitLab OAuth 2.0 authorisation service has no way to sign out of a
third-party application.
After a user logs out of the DTaaS platform, GitLab still shows the user
as signed in.
The next time the user clicks the **Sign In** button on the DTaaS platform
page, the GitLab login page is not displayed.
Instead, the user goes directly to the **Library** page.
Close the browser window after use to avoid this.
Alternatively, open the linked GitLab instance
(ex: `https://intocps.org/gitlab`) and sign out there.
To exit the DTaaS platform completely, the user has to sign out of both
the DTaaS platform and GitLab.

The same applies to the Workspace installation.
