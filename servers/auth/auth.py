import os
import json
import requests
import base64
from flask import Flask, request, abort, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)


@app.route("/auth", methods=["GET"])
def auth():
    try:
        access_token = request.headers.get("Authorization", "").split(" ")[-1]
        
        if not access_token:
            abort(401)

        gitlab_api_url = "https://gitlab.com/api/v4/user"
        headers = {"Authorization": f"Bearer {access_token}"}

        response = requests.get(gitlab_api_url, headers=headers)

        if response.status_code != 200:
            abort(403)

        user_info = response.json()
        username = user_info["username"]

        return jsonify(user_info)
    except Exception as e:
        app.logger.exception("Error in auth endpoint")
        abort(500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090)
