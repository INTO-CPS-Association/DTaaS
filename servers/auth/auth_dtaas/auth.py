"""Module with functions for authentication microservice
Authorize new user, Validate existing sessions"""

from requests_oauthlib import OAuth2Session
import yaml

user_sessions = {}

def authorization():
    """Function to register/authorize a new user with Auth microservice"""
    details_file = open("client.yaml",'r')
    client = yaml.safe_load(details_file)

    client_id = client['id']
    client_secret = client['secret']
    redirect_uri = client['redirect_uri']
    scope = client['scope']

    auth_base_url = "https://gitlab.com/oauth/authorize"
    token_url = "https://gitlab.com/oauth/token"

    gitlab_session = OAuth2Session(client_id, scope = scope, redirect_uri = redirect_uri)
    auth_url, state = gitlab_session.authorization_url(auth_base_url)

    print("Go to following link:\n", auth_url)

    print("Paste full redirect link")
    redirect_response = input()

    access_token = gitlab_session.fetch_token(
    	token_url, client_secret=client_secret, authorization_response=redirect_response
    )
    #print(access_token)

    info = gitlab_session.get("https://gitlab.com/api/v4/user")
    user_sessions[(state, access_token['access_token'])] = gitlab_session
    print("Your info:\n",info.content)

    print("State:", state)
    print("Access Token:", access_token['access_token'])
    return (state, access_token['access_token'])

def validation(state, access_token):
    """Function to validate existing user sessions, AUTHSERVER for Traefik gateway"""
    if (state, access_token) in user_sessions:
        session = user_sessions[(state, access_token)]
        response = session.get("https://gitlab.com/api/v4/user")
        if response.status_code!=200:
            return 403
        print("Your info \n:", response.content)
    else:
        return 404
    return 200

"""
#-- Does it work? Rough tests
s1, at1 = authorization()
print(validation(s1, at1))

s2, at2 = authorization()
print(validation(s2, at2))
print(validation(s1, at1))
print(validation("hwiugugw838982", "aohiuwbu380197309bfkwbo"))
#--
"""