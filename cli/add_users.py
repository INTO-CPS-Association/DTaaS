import yaml

file_path = "compose.users.yml"
DTaaSDir = "\\Users\\astit\\Desktop\\Thesis\\DTaaS"
user_list = [
    ("astitvasehgal19","astitvasehgal19@gmail.com"),
    ("astitvasehgal05","astitvasehgal05@gmail.com")
    ]

class User:
    def __init__(self, username, email):
        self.username= username
        self.email=email
    
    def GetConfig(self):
        config = {
            self.username: {
                "image": "mltooling/ml-workspace-minimal:0.13.2",
                "volumes": [
                    "{DTAAS_DIR}/files/common:/workspace/common".format(DTAAS_DIR=DTaaSDir), 
                    "{DTAAS_DIR}/files/{username}:/workspace".format(DTAAS_DIR=DTaaSDir,username=self.username)
                    ],
                "environment": [
                    'AUTHENTICATE_VIA_JUPYTER=',
                    "WORKSPACE_BASE_URL={username}".format(username=self.username)
                    ],
                "shm_size": "512m",
                "labels":[
                    "traefik.enable=true",
                    "traefik.http.routers.{username}.entryPoints=web".format(username=self.username),
                    "traefik.http.routers.{username}.rule=PathPrefix(`/{username}`)".format(username=self.username),
                    "traefik.http.routers.{username}.middlewares=traefik-forward-auth".format(username=self.username)
                    ]
            }
        }
        return config

def add_users(users):

    for username, email in users:
        user = User(
            username=username,
            email=email
            )
        yaml_output = yaml.dump(user.GetConfig(), sort_keys=False)
        print(yaml_output)
        print()

if __name__ == "__main__":
    add_users(user_list)
