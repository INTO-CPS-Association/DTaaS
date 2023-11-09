# Auth Microservice 

## Install the microservice:

```bash
pip install auth-dtaas==0.1.0
```

## Python CLI usage

### Setup

On your terminal, switch to Python CLI

```bash
python
```

Then, import the **auth** package:

```python
from auth_dtaas import auth
```

You can now use functions of the Auth microservice.

### Register/Authorize new session

```python
auth.authorization()
```

Follow the guide:

1. Paste the displayed link in a web browser
1. If requested, approve access via Gitlab. 
1. Paste the link you are redirected to, into the terminal.

The **state** and **access_token** for this session
will be displayed.

Copy/Save these for later use. 

### Validating existing session

```python
auth.validation(state, access_token)
```

Provide the **state** and **access_token**
of the session requesting validation, as parameters.

In case of successful validation, your account
information will be displayed. Confirm that this is 
the correct account before proceeding. 

Response codes will be returned by this function:

- 200 : OK, User Validated
- 403 : User validation has expired, Requires re-authorization
- 404 : New user/ User is not validation

### Exit

To exit the Python CLI:

```python
exit()
```

