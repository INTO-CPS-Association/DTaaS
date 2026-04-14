<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

🎉 Thank you for downloading **Digital Twin as a Service**.

## 🛠️ Install

The installation instructions provided in this README are
ideal for running the **DTaaS on localhost served over HTTP connection**.

✅ This installation is ideal for single users intending to use
DTaaS on their own computers.

## 🏗️ Design

An illustration of the installation setup is shown here.

<img src="localhost.png" alt="DTaaS Localhost" width="600px" />

## Prerequisites

- Docker Engine v27 or later
- Ports 80 and 5556 available on the host
- At least 2GB RAM available

## ⚡ Quick Demo

The description below refers to filenames. All the commands
mentioned below are to be run this directory.

Copy example configuration files first:

```bash
cp .env.example .env
cp config/dex-config.yaml.example config/dex-config.yaml
```

▶️ Start the demo:

```bash
docker compose up -d
```

The application will be accessible at <http://localhost> from web browser.
Login using the default credentials.

**👤 User email:** `user@intocps.org`
**🔑 Password:** `user`

⏹️ Stop the demo:

```bash
docker compose down
```

## 🌵Limitations

1. All the functionality of DTaaS except DevOps features should be
   available through the single page client now.
1. The installation has default user credentials.
   See [instructions](custom-user.md) for help with changing
   the user credentials.

## 📚 Documentation

See
<https://into-cps-association.github.io/DTaaS/development/index.html>
for complete documentation.

## 🔗 References

Image sources:

Traefik logo:
<https://www.laub-home.de/wiki/>

Dex IdP:
<https://dexidp.io/>
