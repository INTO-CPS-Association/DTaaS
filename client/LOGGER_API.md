# Logger Microservice REST API

## Overview

The DTaaS process workflow logger streams user interaction events to a
backend logger microservice via the browser Beacon API. Events are sent
as fire-and-forget JSON payloads — the client does not wait for or
process responses.

## Base URL

Configured via the `LOGGER_URL` environment variable
(e.g., `https://example.com/logger`).

## Endpoints

### POST /

Ingest a single log event.

#### Request

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Body**: A single JSON log event object.

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userHash": "a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
  "timestamp": "2026-03-24T20:00:00.000Z",
  "event": "click",
  "page": "/library",
  "element": "tab",
  "label": "Functions",
  "context": {
    "tab": "functions",
    "subtab": "private"
  }
}
```

#### Response

| Status                    | Description                               |
| ------------------------- | ----------------------------------------- |
| 200 OK                    | Event accepted                            |
| 204 No Content            | Event accepted (no body)                  |
| 400 Bad Request           | Malformed JSON or missing required fields |
| 413 Payload Too Large     | Body exceeds 64 KB                        |
| 429 Too Many Requests     | Rate limit exceeded                       |
| 500 Internal Server Error | Server failure                            |

> **Note:** Because the client uses the Beacon API (fire-and-forget),
> response status codes are not consumed by the client. The backend
> should still return appropriate codes for monitoring and debugging.

## Log Event Schema

| Field       | Type                 | Required | Description                                              |
| ----------- | -------------------- | -------- | -------------------------------------------------------- |
| `sessionId` | string (UUID v4)     | Yes      | Unique browser session identifier                        |
| `userHash`  | string (SHA-256 hex) | Yes      | Anonymized username hash                                 |
| `timestamp` | string (ISO 8601)    | Yes      | UTC timestamp of the event                               |
| `event`     | string               | Yes      | Event type (currently always `"click"`)                  |
| `page`      | string               | Yes      | URL path of the current page                             |
| `element`   | string               | Yes      | Type of UI element (e.g., `"tab"`, `"button"`, `"link"`) |
| `label`     | string               | Yes      | Human-readable label of the element                      |
| `context`   | object               | No       | Additional key-value metadata                            |

## Privacy

- **Usernames** are anonymized client-side using SHA-256 before
  transmission. The backend never receives plaintext usernames.
- **Session IDs** are random UUID v4 values with no link to user identity.
- No cookies or IP-based tracking is performed by the client.

## Transport

The client uses the
[Beacon API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
(`navigator.sendBeacon`) which:

- Guarantees delivery even during page unload
- Does not block the UI thread
- Sends as HTTP POST with `Content-Type: application/json`
- Payload is a single JSON object (not batched)

## Backend Candidates

Any HTTP server that accepts JSON POST requests can serve as the logger
backend. Compatible open-source options include:

| Service                               | License          | Docker Image      | Notes                                               |
| ------------------------------------- | ---------------- | ----------------- | --------------------------------------------------- |
| [Seq](https://datalust.co/seq)        | Free single-user | `datalust/seq`    | Structured log server with search & dashboards      |
| [Loki](https://grafana.com/oss/loki/) | AGPLv3           | `grafana/loki`    | Log aggregation, pairs with Grafana                 |
| [Vector](https://vector.dev/)         | MPL-2.0          | `timberio/vector` | High-performance log pipeline                       |
| Custom Node.js                        | Any              | N/A               | Simple Express/Fastify endpoint writing JSONL files |

### Example: Minimal Node.js Logger

```javascript
import express from 'express';
import { appendFileSync } from 'fs';

const app = express();
app.use(express.json());

app.post('/logger', (req, res) => {
  appendFileSync('workflow-logs.jsonl', JSON.stringify(req.body) + '\n');
  res.sendStatus(204);
});

app.listen(8080);
```

## Client Configuration

Set the logger backend URL in the DTaaS runtime configuration:

```javascript
window.env = {
  // ... other config
  LOGGER_URL: 'https://your-server.com/logger',
};
```

When `LOGGER_URL` is empty or undefined, backend streaming
is disabled and logs are only written to the browser console.
