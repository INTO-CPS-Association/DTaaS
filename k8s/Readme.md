
---

# 🚀 DTaaS Deployment on K3s (Kubernetes)

This guide explains how to deploy **DTaaS** on a **K3s Kubernetes cluster**, expose the services internally, and access them remotely using **SSH tunneling**.

---

## 📦 Prerequisites

* Ubuntu/Linux system
* `sudo` privileges
* Internet access
* SSH access to the server
* Git installed

---

## 🐳 Install Docker

Docker is required as the container runtime.

```bash
sudo apt-get update
sudo apt-get install docker.io
```

Add your user to the Docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

✅ This allows running Docker commands without `sudo`.

---

## ☸️ Install K3s (Lightweight Kubernetes)

K3s is a minimal Kubernetes distribution, ideal for development and edge use cases.

```bash
curl -sfL https://get.k3s.io | sh -
```

This installs Kubernetes along with `kubectl`.

---

## 🔧 Configure kubectl Access

K3s stores the kubeconfig at `/etc/rancher/k3s/k3s.yaml`.

```bash
sudo chown $USER:$USER /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc
source ~/.bashrc
```

Verify the cluster:

```bash
kubectl get nodes
kubectl get pods -A
```

---

## 📥 Clone DTaaS Repository

Clone the DTaaS source code from GitHub:

```bash
git clone https://github.com/parwinderau/DTaaS.git
```

Navigate to the Kubernetes manifests directory:

```bash
cd ~/DTaaS/k8s/web-app/
```

---

## 🚀 Deploy DTaaS to Kubernetes

Apply all Kubernetes manifests in the directory:

```bash
kubectl apply -f ./
```

This creates:

* DTaaS deployments
* Services (ClusterIP / NodePort depending on config)
* Any required config maps or secrets

---

## 🔍 Verify Deployment

Check that all pods are running:

```bash
kubectl get pods
```

Check services:

```bash
kubectl get svc
```

Example service output:

```text
dtaas-web-service   NodePort   10.43.1.171   <none>   4000:30420/TCP   6m25s
```

Explanation:

* **10.43.1.171** → Internal ClusterIP
* **4000** → Application service port
* **30420** → NodePort exposed on the node

---

## 🔐 Access DTaaS Using SSH Tunneling

Since Kubernetes services are internal, SSH tunneling is used for secure remote access.

---

### 🔹 SSH Tunnel for ClusterIP (No NodePort)

Use this when the service is `ClusterIP` only:

```bash
ssh -L 4000:10.43.1.171:4000 parwinder@sandbox-server.cps.digit.au.dk
```

* Local port `4000` → DTaaS service inside the cluster

---

### 🔹 SSH Tunnel Using NodePort

Use this when the service exposes a NodePort:

```bash
ssh -L 4000:localhost:30420 parwinder@sandbox-server.cps.digit.au.dk
```

* Local port `4000` → NodePort on the Kubernetes node

---

## 🌍 Access DTaaS in the Browser

Once the SSH tunnel is active, open your browser and go to:

```text
http://localhost:4000
```

🎉 The **DTaaS Web UI** should now be accessible.

---

## ✅ Summary

* Installed Docker and K3s
* Configured Kubernetes access
* Cloned and deployed DTaaS
* Verified pods and services
* Accessed DTaaS securely via SSH tunneling

