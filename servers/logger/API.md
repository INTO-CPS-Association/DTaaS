# Logger Microservice REST API

## Overview

The DTaaS process workflow logger streams user interaction events to a
backend logger microservice via the browser Beacon API. Events are sent
as fire-and-forget JSON payloads — the client does not wait for or
process responses.

## Endpoints

### POST /logger

Ingest a single log event.

#### POST Request

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

#### POST Response

| Status                | Description                               |
| --------------------- | ----------------------------------------- |
| 204 No Content        | Event accepted (no body)                  |
| 400 Bad Request       | Malformed JSON or missing required fields |
| 413 Payload Too Large | Body exceeds configured max payload bytes |

The service enables CORS with `Access-Control-Allow-Origin` controlled by
`cors-allow-origin` (`LOGGER_CORS_ALLOW_ORIGIN` in env).
It also always sends `Access-Control-Allow-Credentials: true`.

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
