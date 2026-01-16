# Docker Compose

It contains the following environment variables.

Edit all the fields according to your specific case.

  | URL Path | Example Value | Explanation |
  | :------------ | :--------------- | :--------------- |
  | DTAAS_DIR | '/Users/username/DTaaS' | Full path to the DTaaS directory. This is an absolute path with no trailing slash. |
  | SERVER_DNS | <http>_foo.com_</http> | The server DNS, if you are deploying with a dedicated server. Remember not use  <http:>http(s)</http:> at the beginning of the DNS string |
  | OAUTH_URL | <http>_gitlab.foo.com_<http/> | The URL of your Gitlab instance. It can be <http>_gitlab.com_<http/> if you are planning to use it for authorization. |
  | OAUTH_CLIENT_ID | 'xx' | The ID of your server OAuth application |
  | OAUTH_CLIENT_SECRET | 'xx' | The Secret of your server OAuth application |
  | OAUTH_SECRET | 'random-secret-string' | Any private random string. This is a password you choose for local installation. |
  | username1 | 'user1' | The gitlab instance username of a user of DTaaS |
  | username2 | 'user2' | The gitlab instance username of a user of DTaaS |

:clipboard: Important points to note:

1. The path examples given here are for Linux OS.
   These paths can be Windows OS compatible paths as well.
1. The Server DNS can also be an IP address.
   However, for proper working it is neccessary to use the same
   convention (IP/DNS) in the client configuration file
   (`deploy/config/client/env.js`) as well.
