"""The GitLab API failures every call in this package is prepared for.

python-gitlab raises its own exceptions for what the server answers, but a
connection it never got an answer from surfaces as the underlying requests
exception, unwrapped. Both are caught wherever this package calls the API,
so a caller looping over users is never aborted by one unreachable moment:
the failure is reported as that user's, in the value the call returns.
"""

import gitlab.exceptions
import requests

API_ERRORS = (gitlab.exceptions.GitlabError, requests.RequestException)
