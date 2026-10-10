# Logger Microservice

The logger microservice receives workflow interaction events from the DTaaS
client and stores them as JSON Lines.

The client sends events to the URL configured in `LOGGER_URL`. Include the
`/logger` route prefix, for example:

```javascript
LOGGER_URL: "https://example.com/logger";
```

For non-Docker local development, use the logger's direct port:

```javascript
LOGGER_URL: "http://localhost:4003/logger";
```

Remote logging is disabled by default. When a logger URL is configured,
users can enable it with the **Send logs to ...** checkbox under
**Logging Settings** on the **Settings** tab of the **Account** page.

The API is specified in
[`servers/logger/API.md`](https://github.com/INTO-CPS-Association/DTaaS/blob/main/servers/logger/API.md).
