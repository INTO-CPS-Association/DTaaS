"""Module with functions for authentication microservice
Authorize new user, Validate existing sessions"""

from requests_oauthlib import OAuth2Session

user_sessions = {}

def authorization():
    """Function to register/authorize a new user with Auth microservice"""
    client_id = "d46fa9108b53cc229d70452029b5ad19b387677ab32d25643382cbf873dd6d60"
    client_secret = "gloas-3e6eccf19faf55ac8a2252c2a3538359c439b214d38c3e6d8974f4b9ca599c98"
    redirect_uri = "https://your.callback/uri"
    scope = ["read_user"]

    auth_base_url = "https://gitlab.com/oauth/authorize"
    token_url = "https://gitlab.com/oauth/token"

    gitlab_session = OAuth2Session(client_id, scope = scope, redirect_uri = redirect_uri)
    auth_url, state = gitlab_session.authorization_url(auth_base_url)

    print("Go to following link: ", auth_url)

    print("Paste full redirect link")
    redirect_response = input()

    access_token = gitlab_session.fetch_token(
    	token_url, client_secret=client_secret, authorization_response=redirect_response
    )
    print(access_token)

    info = gitlab_session.get("https://gitlab.com/api/v4/user")
    user_sessions[(state, access_token['access_token'])] = gitlab_session
    print(info.content)

    return (state, access_token['access_token'])

def validation(state, access_token):
    """Function to validate existing user sessions, AUTHSERVER for Traefik gateway"""
    if (state, access_token) in user_sessions:
        session = user_sessions[(state, access_token)]
        response = session.get("https://gitlab.com/api/v4/user")
        if response.status_code!=200:
            return 403
        print(response.content)
    else:
        return 404
    return 200

#-- Does it work? Rough tests
s1, at1 = authorization()
print(validation(s1, at1))

s2, at2 = authorization()
print(validation(s2, at2))
print(validation(s1, at1))
print(validation("hwiugugw838982", "aohiuwbu380197309bfkwbo"))
#--
