# Performance Measurement

The DTaaS has a built-in tool that measures the execution time of
Digital Twin features. Developers can use it to understand performance
and to record baselines for later optimization.

## Accessing the Measurement Page

Open the measurement page from the **Measurement** card on the
**Automation** page, or at `http://localhost:4000/insights/measure` or
`https://intocps.org/insights/measure`. Only signed-in users can
open this page.

![Measurement page](./images/measurement-page.png)

## Features

### Measurement Tasks

The measurement suite includes the following tasks, each measuring a
different aspect of Digital Twin execution:

| Task                                            | Description                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Valid Setup Digital Twin Execution              | Runs the primary Digital Twin with current setup                      |
| Multiple Identical Digital Twins Simultaneously | Runs the primary Digital Twin twice at once                           |
| Multiple different Digital Twins Simultaneously | Runs the primary and secondary Digital Twins at once                  |
| Different Runners same Digital Twin             | Runs the primary Digital Twin twice with 2 different runners          |
| Different Runners different Digital Twins       | Runs the primary and secondary Digital Twins with 2 different runners |

By default, the primary Digital Twin is `hello-world` and the secondary
is `mass-spring-damper`. Both can be changed in the measurement settings.

![Measurement running the tasks](./images/measurement-running.png)

### Configuration Options

The configuration is in the **Measurement Settings** section of the
**Settings** tab on the **Account** page.

- **Trial Number**: number of times each task is repeated to calculate
  the average execution time (default: 3).
- **Measurement Secondary Runner Tag**: the runner tag used for
  multi-runner measurement tests. The primary runner tag is the
  **Runner Tag** field of the same settings tab.
- **Primary Digital Twin**: the Digital Twin used in single-DT and
  same-DT measurement tasks (default: `hello-world`).
- **Secondary Digital Twin**: the Digital Twin used as the second DT
  in multi-DT measurement tasks (default: `mass-spring-damper`).

Note: the first time the settings page is visited in a session, the
**Primary Digital Twin** and **Secondary Digital Twin** dropdowns load
the list of available Digital Twins. They stay disabled until loading
completes.

  ![Measurement settings](./images/measurement-settings.png)

### Controls

- **Start**: begin the measurement suite from the first task
- **Stop**: cancel all running executions (asks for confirmation)
- **Restart**: discard all current results and start again (asks for
  confirmation)
- **Export**: download all measurement results as a JSON file
  (available when results exist)
- **Purge**: delete all stored measurement data from the database

## Understanding Results

### Status Values

| Status   | Meaning                           |
| -------- | --------------------------------- |
| PENDING  | Task has not started yet          |
| RUNNING  | Task is currently executing       |
| SUCCESS  | All trials completed successfully |
| FAILURE  | One or more trials failed         |
| STOPPED  | Task was interrupted by user      |

### Metrics

- **Average Duration**: mean execution time across all trials of a task
- **Total Time**: time for the complete measurement suite (shown after
  completion)

### Measurement Table Columns

The measurement results table has the following columns:

| Column           | Description                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Task             | Task number, name, and description                                                                              |
| Status           | Current execution status (PENDING, RUNNING, SUCCESS, FAILURE, or STOPPED); a dash before the task is queued      |
| Average Duration | Mean execution time across all completed trials, displayed in seconds                                           |
| Trials           | Visual cards showing each trial's execution details and status. Each trial represents one iteration of the task |
| Data             | Download button to export individual task results as JSON                                                       |

Click a row to expand it and show a toggle next to the task
description. A disabled task is skipped during execution.

## Data Storage

Measurement data is stored in the browser's IndexedDB, separately from
the regular execution history. As a result:

- measurements do not mix with normal DT execution logs
- measurement data can be purged without affecting execution history
- results can be downloaded as JSON for further analysis

## Downloading Results

### Per-Task Download

After a task completes successfully, click **Download Task Results** in
the Data column to export that task's measurements as JSON.

### Full Results Download

The **Export** button in the controls toolbar downloads all
measurement results as JSON. It is available whenever results exist.

The figure below shows both options after a completed measurement run.

![Highlighted download links for measurement data](./images/measurement-download-options.png)

### JSON Format

The exported JSON describes each task and its trials. Each trial is one
iteration of a task and contains an `executions` array with the
pipeline execution details. The configuration is shared at the task
level, and each execution includes its runner tag. The task records its
own start and end times. A trial carries an `Error` field only when it
records an error.

The exported JSON has the following structure:

```json
{
  "totalTimeSeconds": number,
  "tasks": [
    {
      "Task Name": string,
      "Description": string,
      "config": {
        "Branch name": string,
        "Group name": string,
        "Common Library project name": string,
        "DT directory": string
      },
      "trials": [
        {
          "Time Start": "ISO8601 timestamp",
          "Time End": "ISO8601 timestamp",
          "Status": "PENDING | RUNNING | SUCCESS | FAILURE | STOPPED",
          "Error": string,
          "executions": [
            {
              "dtName": string,
              "pipelineId": number,
              "status": string,
              "Runner tag": string
            }
          ]
        }
      ],
      "Time Start": "ISO8601 timestamp",
      "Time End": "ISO8601 timestamp",
      "Average Time (s)": number,
      "Status": string
    }
  ]
}
```

## Timing Behaviour

The measurement system waits 750ms between some requests so that
the GitLab instance does not receive them all at once:

- **Between trials**: a 750ms delay is applied before each trial
  *except the first*. Trial 0 starts immediately; trials 1, 2, and so
  on each wait 750ms after the previous trial completes.
- **Between executions within a trial**: when a task runs several
  Digital Twins (for example, "Multiple different Digital Twins
  Simultaneously"), each execution is staggered by 750ms. The first
  execution starts immediately, the second after 750ms, the third after
  1500ms, and so on.

After starting each pipeline, the measurement also waits 10 seconds and
checks that GitLab accepted it. A pipeline that failed or was canceled
in that time is started again.

The **Average Duration** of a task includes the stagger delay between
executions and the 10-second acceptance check. It does *not* include
the delay between trials, because each trial's timer starts after
that delay.

## Best Practices

1. Run measurements when the system is lightly used, to get consistent
   results.
2. Use several trials (3-5) for more reliable averages.
3. Make sure runners are available before starting the measurement.
4. You can navigate to other pages while a measurement runs; execution
   continues in the background. However, **changing the URL, refreshing
   or closing the tab stops the measurement**. Notifications tell you
   when the measurement completes or stops.

## Troubleshooting

| Issue                                     | Solution                                                   |
| ----------------------------------------- | ---------------------------------------------------------- |
| Task appears stuck, old pipelines appear  | Reauthenticate the app by refreshing the tab               |
| Tasks time out                            | Verify runners are online, use the tag and are accessible  |

## Related Documentation

- [Concurrent Execution](./concurrent-execution.md)
- [Execution Settings](./execution-settings.md)
- [Capabilities](./capabilities.md)
