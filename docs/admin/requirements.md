# Requirements

<!-- markdownlint-disable MD046 -->
<!-- prettier-ignore -->
!!! tip localhost

    These optional requirements are not needed for
    [**localhost**](./localhost.md) installation.
    They are only required for installation of the DTaaS on
    a production web server.
<!-- markdownlint-enable MD046 -->

There are two optional requirements for installing the DTaaS.

## OAuth Provider

The DTaaS software is uses OAuth for user authorization. It is
possible to use either <http:>_gitlab.com_</http:> or your own
OAuth service provider.

## Domain name

The DTaaS software is a web application and is preferably hosted
on a server with a domain name like <http:>_foo.com_</http:>.
However, it is possible to install the software on your computer
and use access it at <http:>_localhost_</http:>.
