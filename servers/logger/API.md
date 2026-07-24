# Logger Microservice REST API

## Overview

The DTaaS process workflow logger streams user interaction events to a
backend logger microservice via the browser Beacon API. Events are sent
as fire-and-forget JSON payloads — the client does not wait for or
process responses.

## Base URL

The bundled DTaaS client expects `LOGGER_URL` to include the logger route
prefix, for example `https://example.com/logger`. With that value, events are
posted to `/logger` and health checks use `/logger/health`.

## Endpoints

### POST /logger

Ingest a single log event.

#### POST Request

- **Method**: `POST`
- **Content-Type**: `application/json` or `text/plain` (the bundled client
  sends `text/plain` via `navigator.sendBeacon` to avoid a CORS preflight;
  both are parsed as JSON)
- **Body**: A single JSON log event object.

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userHash": "a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
  "timestamp": "2026-03-24T20:00:00.000Z",
  "event": "click",
  "page": "/preview/digitaltwins",
  "element": "button",
  "label": "Start",
  "context": {
    "dt": {
      "name": "WaterTank",
      "button": "start",
      "history": ["2026-03-24T19:00:00.000Z"]
    }
  }
}
```

#### POST Response

| Status                    | Description                               |
| ------------------------- | ----------------------------------------- |
| 204 No Content            | Event accepted (no body)                  |
| 400 Bad Request           | Malformed JSON or missing required fields |
| 413 Payload Too Large     | Body exceeds configured max payload bytes |
| 429 Too Many Requests     | Rate limit exceeded                       |
| 500 Internal Server Error | Server failure                            |

The service enables CORS with `Access-Control-Allow-Origin` controlled by
`cors-allow-origin` (`LOGGER_CORS_ALLOW_ORIGIN` in env).
Set `cors-allow-credentials` (`LOGGER_CORS_ALLOW_CREDENTIALS`) to `true` to
send `Access-Control-Allow-Credentials: true`. This requires explicit allowed
origins; it cannot be combined with `cors-allow-origin: '*'`.

### GET /logger/health

Returns service health.

#### Health Response

| Status | Description                                 |
| ------ | ------------------------------------------- |
| 200 OK | Service is available (`{ "status": "ok" }`) |

> **Note:** Because the client uses the Beacon API (fire-and-forget),
> response status codes are not consumed by the client. The backend
> should still return appropriate codes for monitoring and debugging.

## Log Event Schema

| Field             | Type                 | Required | Description                                                                                             |
| ----------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `sessionId`       | string (UUID v4)     | Yes      | Unique browser session identifier                                                                       |
| `userHash`        | string (SHA-256 hex) | Yes      | Anonymized username hash                                                                                |
| `timestamp`       | string (ISO 8601)    | Yes      | UTC timestamp of the event                                                                              |
| `event`           | string enum          | Yes      | Event type: `"click"`, `"change"`, `"navigation"`, `"notification"`, or `"dismiss"`                     |
| `page`            | string               | Yes      | URL path of the current page                                                                            |
| `page_transition` | object               | No       | Navigation transition metadata, when present: `{ "src": "/from", "target": "/to" }`                     |
| `element`         | string               | Yes      | Type of UI element (e.g., `"button"`, `"checkbox"`, `"snackbar"`, `"dialog"`)                          |
| `label`           | string               | Yes      | Human-readable label of the element                                                                     |
| `context`         | object               | No       | Additional metadata; max 6 levels, 100 total nested entries, 128-char keys, and 1024-char string values |

## Privacy

- **Usernames** are hashed client-side using SHA-256 before transmission. This
  is pseudonymization, not anonymization: the same username produces the same
  hash, so events for one user can still be linked together. The backend never
  receives plaintext usernames from the bundled client.
- **Session IDs** are random UUID v4 values with no link to user identity.
- No cookies or IP-based tracking is performed by the client.
