DEPLOY_DOCKER_DIR := ./deploy/docker
DEPLOY_GITLAB_DIR := ./deploy/services/gitlab

.PHONY: start-localhost stop-localhost
.PHONY: start-http stop-http
.PHONY: start-https stop-https
.PHONY: start-gitlab stop-gitlab

# Running the local gitlab instance (takes a few minutes)
start-gitlab:
	cd $(DEPLOY_GITLAB_DIR) && \
		docker compose up -d

stop-gitlab:
	cd $(DEPLOY_GITLAB_DIR) && \
		docker compose down

# Running the server on localhost
start-localhost:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.local.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.local up -d

stop-localhost:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.local.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.local down

# Running the server at http://<your-site>
start-http:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.server.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.server up -d

stop-http:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.server.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.server down

# Running the server at https://<your-site>
start-https:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.server.secure.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.server up -d

stop-https:
	docker compose -f $(DEPLOY_DOCKER_DIR)/compose.server.secure.yml --env-file $(DEPLOY_DOCKER_DIR)/.env.server down
