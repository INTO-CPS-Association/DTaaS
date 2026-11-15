"""The GitLab API failures every call in this package is prepared for.

python-gitlab raises its own exceptions for what the server answers, but a
connection it never got an answer from surfaces as the underlying requests
exception, unwrapped. Both are caught wherever this package calls the API,
so a caller looping over users is never aborted by one unreachable moment:
the failure is reported as that user's, in the value the call returns.
"""

import re

import gitlab.exceptions
import requests

API_ERRORS = (gitlab.exceptions.GitlabError, requests.RequestException)

_REQUEST_ID_RE = re.compile(r"Request ID: <code>([^<]+)</code>")


def describe_api_error(exc: Exception) -> str:
    """Return *exc* as one short line for a message.

    When GitLab answers with an HTML error page instead of JSON,
    python-gitlab puts the whole page in the exception text. That page is
    replaced by "GitLab error page" and the request ID it shows, which
    finds the failure in GitLab's logs, after the HTTP status when the
    exception has one. Every other error reads as before.
    """
    message = getattr(exc, "error_message", "")
    if not isinstance(message, str) or not message.lstrip().startswith("<"):
        return str(exc)
    found = _REQUEST_ID_RE.search(message)
    page = "GitLab error page"
    if found:
        page += f" (request ID {found.group(1)})"
    status = getattr(exc, "response_code", None)
    return page if status is None else f"{status}: {page}"
