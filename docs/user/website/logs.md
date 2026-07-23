# Logs

The DTaaS website includes a client-side logging feature that records how
users interact with the workbench: page navigation, button and link clicks,
form changes, and notifications. These events are captured entirely in the
browser and can be reviewed on the **Workflow Logs** page.

## 🔓 Enabling Logging

Logging is disabled by default. It can be enabled using the
**Enable Logging** checkbox in the **Logging Settings** section of the
[Settings](settings.md) page (**Account** > **Settings**). No events are
captured, and none of the pages described below record anything, until this
checkbox is turned on.

If the DTaaS installation is configured to stream events to a remote logging
server, a notice is shown on the Settings page. Remote logging should only be
kept enabled with the consent of the person whose workbench activity is
being recorded.

## 👁️ Viewing the Logs

> **URL**: `https://intocps.org/insights/log` or
> `http://localhost:4000/insights/log`

The logs are viewed by navigating directly to `/insights/log` on the DTaaS
installation. The page is titled **Workflow Logs**, and the :fontawesome-solid-circle-info:
icon next to the title expands a short description of the page.

![Workflow Logs](images/logs-all.png)

The toolbar above the log list provides the following controls:

| Control                     | Description                                                                             |
| :--------------------------- | :---------------------------------------------------------------------------------------- |
| Filter logs                 | Narrows the entries shown to those matching the search text (see [Filtering](#filtering-logs)). |
| :material-refresh: Refresh  | Reloads the log entries from local storage.                                             |
| Raw view :material-code-braces: | Switches between the card view and the raw JSON Lines view.                        |
| :material-delete-outline: Clear logs | Permanently deletes all stored log entries, after confirmation.                |
| Download                    | Exports the currently displayed entries as a `.jsonl` file.                             |
| Live update                 | Streams new events into the view as they are recorded.                                  |

## 🗂️ Log Entries (Card View)

Each entry is shown as a card with:

- A coloured chip identifying the event type: `click`, `change`, `navigation`,
  `notification`, or `dismiss`.
- The label of the element that triggered the event.
- The timestamp of the event.
- The element type and the page path on which the event occurred.
- Any additional context recorded for the event, shown as small chips
  (for example a link's target URL, or a form field's changed value).

## 🔍 Filtering Logs {#filtering-logs}

Typing into the **Filter logs** box narrows the entries to those whose event
type, label, element, page, or context text contains the search text. The
entry count above the log list updates to show how many of the total
entries match, for example *3 of 10 log entries*.

![Filtered Workflow Logs](images/logs-filter.png)

The **Download** button label changes to **Download Filtered JSONL** while a
filter is active, so only the entries currently shown are exported.

## 🧾 Raw View

Toggling **Raw view** displays the same entries as pretty-printed JSON
Lines instead of cards, and adds a **Copy to clipboard** button. To keep the
page responsive, both the card view and the raw view render at most 500
entries; a note is shown when more entries exist. **Download** and
**Copy to clipboard** are not affected by this limit and always cover every
entry currently displayed (i.e. respecting the filter, if any).

Each line is a single JSON object. Entries are shown newest-first,
so a click on a link followed by the resulting page navigation appears as:

```json
{
  "timestamp": "2026-07-22T20:19:02.736Z",
  "event": "navigation",
  "label": "/preview/digitaltwins",
  "element": "page",
  "page": "/preview/digitaltwins",
  "context": {},
  "sessionId": "eaba3642-324e-4f3b-bd21-4204ddd10ebe",
  "userHash": "dee55bf8057abd8211bf80d6513577ff260e739d627c20762d9d617a393a89db"
}

{
  "timestamp": "2026-07-22T20:19:01.245Z",
  "event": "click",
  "label": "Digital Twins page preview",
  "element": "link",
  "page": "/workbench",
  "context": {
    "link": {
      "url": "/preview/digitaltwins"
    }
  },
  "sessionId": "eaba3642-324e-4f3b-bd21-4204ddd10ebe",
  "userHash": "dee55bf8057abd8211bf80d6513577ff260e739d627c20762d9d617a393a89db"
}
```

### Log Event Fields

| Field             | Description                                                                          |
| :----------------- | :------------------------------------------------------------------------------------- |
| `timestamp`        | UTC time the event was recorded, in ISO 8601 format.                                 |
| `event`            | The event type: `click`, `change`, `navigation`, `notification`, or `dismiss`.       |
| `label`            | A human-readable label for the element involved.                                     |
| `element`          | The type of UI element involved, e.g. `link`, `button`, `tab`, `page`.               |
| `page`             | The URL path of the page on which the event occurred.                                |
| `page_transition`  | Present on some `navigation` events; records the source and target page.             |
| `context`          | Additional metadata specific to the event, e.g. a link's target URL.                 |
| `sessionId`        | A random identifier generated for the current browser session.                       |
| `userHash`         | A SHA-256 hash of the username, used to link events without recording it in plain text. |

## 🔴 Live Updates

Turning on **Live update** subscribes the page to new log events as they are
recorded elsewhere in the browser (including other open tabs), and reloads
the list automatically. It is turned off by default because continuously
reloading a large log store is unnecessary while just reviewing past
entries.

## 🗑️ Clearing Logs

The :material-delete-outline: icon opens a confirmation dialog before
permanently deleting all stored log entries. This action cannot be undone,
and only clears entries stored locally in the browser; it has no effect on
any copies already streamed to a remote logging server.

## 🔒 Privacy and Storage

- Log entries are stored locally in the browser (IndexedDB) and never leave
  the device, unless the DTaaS installation is configured with a remote
  logging server, in which case entries are also streamed to that server.
- The local log store is capped in size; the oldest entries are pruned
  automatically once the cap is reached.
- The `userHash` field is a hash of the username, not the username itself.
  This pseudonymizes the user while still allowing their events to be
  linked together.
- The `sessionId` field is a random value generated per browser session and
  is not linked to user identity.

## 💭 Summary

This page has described the client-side logging feature of the DTaaS
website: enabling it from Settings, viewing and filtering recorded events
on the Workflow Logs page, switching between card and raw JSON Lines views,
downloading and clearing logs, and the privacy properties of the stored
data.
