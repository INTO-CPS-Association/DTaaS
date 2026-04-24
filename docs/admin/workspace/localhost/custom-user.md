<!-- markdownlint-disable MD041 -->
![DTaaS logo](dtaas.png)

ℹ️ The instructions in this document help update the username and
password for the localhost version of the **DTaaS** installation.

## ⚙️ Update Configuration

Duplicate `config/dex-config.yaml.example` to
`config/dex-config.yaml`.
Update these fields in `config/dex-config.yaml`:

- `email`
- `hash` (bcrypt hash of the chosen password)
- `username`, `name`, `preferredUsername`

Dex configuration details are documented in [`dex.md`](dex.md).

Edit `.env`.

  | URL Path     | Example Value | Explanation                           |
  | :----------- | :------------ | :------------------------------------ |
  | DEFAULT_USER | 'user'        | Dex username set in `dex-config.yaml` |

⚠️ Important alignment for local/passwordDB mode:

- In `.env`, choose `DEFAULT_USER=<your-user>`.
- In `config/dex-config.yaml`, set static user `username`
  and `preferredUsername` to the same value.

✅ This keeps DTaaS user-scoped routes aligned with OIDC identity claims.

## ▶️ Run

Start the application:

```bash
docker compose up -d
```

Stop the application:

```bash
docker compose down
```

### 🌍 Use

The application will be accessible at:
<http://localhost> from web browser.
Sign in using the new user credentials in Dex configuration file (`config/dex-config.yaml`).

All the functionality of DTaaS should be available
through the single page client now.

## 📚 Documentation

See
<https://into-cps-association.github.io/DTaaS/development/index.html>
for complete documentation.

## 🧩 Dex Companion in Detail

The companion service proxies all Dex endpoints and injects a
`profile` claim into `/dex/userinfo` when `preferred_username`
is present. This keeps the setup self-contained
(no GitLab connector) while matching the DTaaS client
expectation for username extraction.

ℹ️ Scope note for local/passwordDB mode:

- Supported: `openid profile email groups offline_access`
- Not supported by Dex local passwordDB: `read_user read_repository api`

## 🔗 References

Image sources:

Traefik logo:
<https://www.laub-home.de/wiki/>

Dex IdP:
<https://dexidp.io/>
