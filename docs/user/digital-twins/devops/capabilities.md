<!-- markdownlint-disable MD013 -->
# Capabilities

Besides creating and editing digital twins, you can run them and adjust
their execution parameters. The DTaaS can run several digital twins at
the same time, and you can change settings while they run without
fetching the data manually: the data loads again when you return to the
branch and group used for the execution. The settings cover both
repository and execution options. All twins can be run and checked from
the **Execute** tab of the **Digital Twins Page**.

Read more about [Settings](../../website/settings.md),
[Setting Values](./execution-settings.md) and
[Concurrent Execution](./concurrent-execution.md) on their own pages.

The following sections describe what each of these features can do.

## Settings

The table below lists the test setups (valid, invalid, and so on), the
behaviour that was expected and the behaviour that was observed.
Each table is followed by a summary and a list of problems found.

| Setting                                                                         | Expected behaviour                                                                      | Observed behaviour                                                                                                                                                                                                                                        | Test method                                                                                                                                                                                                                         |
| :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner tag **valid**                                                            | Job is picked up by runner with relevant tag and completes without error.               | Pass: Same as expected.                                                                                                                                                                                                                                   | Go to the Settings tab of the Account page. Change Runner Tag. Go back one page. Execute Hello world twin. Verify runner name based on tag (repeat with 2nd runner)                                                                 |
| Runner tag **invalid**                                                          | Job is never picked up. Runner times out after 10 minutes.                              | Pass: Same as expected.                                                                                                                                                                                                                                   | Change Runner Tag to "foo" (nonexistent). Run Hello World twin.                                                                                                                                                                     |
| Runner Tag **no value**                                                         | Configuration saves. Running a twin succeeds if appropriate runner exists.              | Fail: Not picked up, times out.                                                                                                                                                                                                                           | Set `run_untagged = false` in local gitlab runner config. Mark "Run untagged jobs" as true in gitlab instance (<https://dtaas-digitaltwin.com/gitlab>). Change Runner Tag to the empty string on application. Run Hello world twin. |
| Branch **valid**                                                                | Job runs with the correct branch and completes without error.                           | Pass: Same as expected.                                                                                                                                                                                                                                   | Make new branch in GitLab instance project. Change Branch Name to "master-2". Execute Hello world twin. Verify ref matches branch in execution log.                                                                                 |
| Branch **invalid**                                                              | Execute tab gracefully displays no twins as branch does not exist.                      | Fail: IF twins are not cached: Throws an error displayed to user: An error occurred while fetching assets: GitbeakerRequestError. IF twins are cached: Job fails. Snackbar says "Execution error for [twin name]". No log available in execution history. | Change Branch Name to "master-1" (nonexistent). IF twins are cached: Execute Hello world twin.                                                                                                                                      |
| Group name **valid**                                                            | The twin is runnable.                                                                   | Pass: Same as expected.                                                                                                                                                                                                                                   | Click "Reset to Defaults". Run twin.                                                                                                                                                                                                |
| Group name **invalid**                                                          | Execute tab gracefully displays no twins as group does not exist.                       | Fail: Same as Branch invalid case.                                                                                                                                                                                                                        | Change Group Name to "Foo" (nonexistent). IF twins are cached: Execute Hello world twin.                                                                                                                                            |
| Common name **valid**                                                           | Library twins are visible.                                                              | Pass: Same as expected. *Private twins also show up in Common twins.                                                                                                                                                                                      | Click "Reset to Defaults". Go to the Library Page. Go to common twins. Inspect twin visibility.                                                                                                                                     |
| Common name **invalid**                                                         | Library twins gracefully not visible.                                                   | Fail: Displays error: An error occurred while fetching assets: Error: Common project foo not found                                                                                                                                                        | Change Common Library Project Name to "Foo" (nonexistent). Go to common twins. Inspect visibility.                                                                                                                                  |
| DT directory **valid**                                                          | Twins are visible.                                                                      | Pass: Same as expected.                                                                                                                                                                                                                                   | Click "Reset to Defaults". Go to the Library Page. Go to the Execute tab. Inspect twin visibility.                                                                                                                                  |
| DT directory name **invalid**                                                   | Twins gracefully not visible.                                                           | Fail: Depends on the cache. Displays error if there is none: An error occurred while fetching assets: GitbeakerRequestError                                                                                                                               | Change DT Directory to "Foo" (nonexistent). Go to the Execute tab. Inspect twin visibility.                                                                                                                                         |
| Group Name, DT Directory, Common Library Project Name, Branch name **no value** | Invalid value caught early. Cannot save, appropriate feedback of invalid form fill out. | Fail: Same as Branch invalid case.                                                                                                                                                                                                                        | Change Group Name, DT Directory, Common Library Project Name, Branch Name to the empty string.                                                                                                                                      |

**Summary:**
Changing to valid settings works. At best, invalid settings display an
error in the page (no cache); otherwise the page shows stale twins.

**Problems:**

- Stale state is kept after settings are updated unless the page is refreshed.
- Technical errors are shown to the user when the settings are invalid.
- Invalid values such as empty strings are accepted when a value is required.
- Runners without tags may not work, though this may be a local problem.
- Private twins show up as common twins.

!!! note
    These tests were run against an earlier version of the website.
    The Settings form now rejects an empty value in any of these fields
    and shows a "... is required" message, so the **no value** cases can
    no longer be saved.

## Concurrent Execution

| Expected behaviour                          | Observed behaviour      | Test method                               |
| ------------------------------------------- | ----------------------- | ----------------------------------------- |
| Both twins run successfully simultaneously. | Pass: Same as expected. | Run the same twin twice at the same time. |
| All twins run successfully simultaneously.  | Pass: Same as expected. | Run different twins at the same time.     |

### Concurrent Execution Across Different Runners

| Expected behaviour                                                                                     | Observed behaviour      | Test method                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Both twins run successfully simultaneously. They report the correct runner name in the Execution logs. | Pass: Same as expected. | Set up 2 ubuntu GitLab runners with different tags. Change Runner Tag to first runner's tag. Execute twin. Change Runner Tag to second runner tag. Execute another twin. |
| History stays after editing, it is still executing.                                                    | Pass: Same as expected. | Execute → Edit settings → Execute. Check: is history still there?  Does it look correct?                                                                                 |

**Summary:**

All functionality works according to the tests. The logs remain
after settings change, and any combination of twins and runners
works (only Ubuntu runners were tested).

## Implementing Backends

By default the DTaaS uses GitLab as its execution and storage backend,
but other combinations may suit some installations better. The code base
is designed so that a new backend does not require a rewrite from scratch.
Future versions of the DTaaS may include more backends by default,
such as GitHub and Azure.

## Summary

Digital twins can be queued as needed, and changing settings while they
run does not lose data, so several setups can be tested at the same time.
Developers can also add new backends.
