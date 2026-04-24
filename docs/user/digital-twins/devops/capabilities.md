<!-- markdownlint-disable MD013 -->
# Capabilities

In addition to creating and editing Digital Twins, it is also possible
to run them and adjust their execution parameters. The DTaaS permits
running multiple Digital Twins simultaneously and even changing settings while
they are running, without the need to manually fetch
the data: it will load upon returning to whichever branch and group was
used for execution. The settings include both repository and execution options,
while all twins can readily be run and checked from the Execution tab under
the Preview page.

Read more about [Settings](../../website/settings.md),
[Setting Values](./execution-settings.md) and
[Concurrent Execution](./concurrent-execution.md) on their respective pages.

The following sections describe the specific capabilities of each of these features.

## ⚙️ Settings

The table below describes the different test setups (valid, invalid, etc.), the
resultant behaviour and what was deemed to be expected behaviour across the
features. Following every table, there is a summary and list of potential
problems.

| Setting                                                                         | Expected behaviour                                                                     | Observed behaviour                                                                                                                                                                                                                                    | Test method                                                                                                                                                                                                                         |
|:---|:---|:---|:---|
| Runner tag **valid**                                                            | Job is picked up by runner with relevant tag and completes without error.              | ✅ Same as expected.                                                                                                                                                                                                                                   | Goto Preview page. Go to Account. Change Runner Tag. Go back one page. Execute Hello world twin. Verify runner name based on tag (repeat with 2nd runner)                                                                           |
| Runner tag **invalid**                                                          | Job is never picked up. Runner times out after 10 minutes.                             | ✅ Same as expected.                                                                                                                                                                                                                                   | Change Runner Tag to "foo" (inexistent). Run Hello World twin.                                                                                                                                                                      |
| Runner Tag **no value**                                                         | Configuration saves. Running a twin succeeds if appropriate runner exists.             | ❌ Not picked up, times out.                                                                                                                                                                                                                           | Set `run_untagged = false` in local gitlab runner config. Mark "Run untagged jobs" as true in gitlab instance (<https://dtaas-digitaltwin.com/gitlab>). Change Runner Tag to the empty string on application. Run Hello world twin. |
| Branch **valid**                                                                | Job runs with the correct branch and completes without error.                          | ✅ Same as expected.                                                                                                                                                                                                                                   | Make new branch in GitLab instance project. Change Branch name to "master-2". Execute Hello world twin. Verify ref matches branch in execution log.                                                                                 |
| Branch **invalid**                                                              | Execution tab gracefully displays no twins as branch does not exist.                   | ❌ IF twins are not cached: Throws an error displayed to user: An error occurred while fetching assets: GitbeakerRequestError. IF twins are cached: Job fails. Snackbar says "Execution error for [twin name]". No log available in execution history. | Change Branch name to "master-1" (inexistent). IF twins are cached: Execute Hello world twin.                                                                                                                                       |
| Group name **valid**                                                            | The twin is runnable.                                                                  | ✅ Same as expected.                                                                                                                                                                                                                                   | Click "reset to defaults". Run twin.                                                                                                                                                                                                |
| Group name **invalid**                                                          | Execution tab gracefully displays no twins as group does not exist.                    | ❌ Same as Branch invalid case.                                                                                                                                                                                                                        | Change group name to "Foo" (inexistent). IF twins are cached: Execute Hello world twin.                                                                                                                                             |
| Common name **valid**                                                           | Library twins are visible.                                                             | ✅ Same as expected. *Private twins also show up in Common twins.                                                                                                                                                                                      | Click "reset to defaults". Goto library. Goto common twins. Inspect twin visibility.                                                                                                                                                |
| Common name **invalid**                                                         | Library twins gracefully not visible.                                                  | ❌ Displays error: An error occurred while fetching assets: Error: Common project foo not found                                                                                                                                                        | Change Common Library Project name to "Foo" (inexistent). Goto common twins. Inspect visibility.                                                                                                                                    |
| DT directory **valid**                                                          | Twins are visible.                                                                     | ✅ Same as expected.                                                                                                                                                                                                                                   | Click "reset to defaults". Goto library. Goto Execution tab. Inspect twin visibility.                                                                                                                                               |
| DT directory name **invalid**                                                   | Twins gracefully not visible.                                                          | ❌ Depends on the cache. Displays error if there is none: An error occurred while fetching assets: GitbeakerRequestError                                                                                                                               | Change Common DT directory name to "Foo" (inexistent). Goto Execution tab. Inspect twin visibility.                                                                                                                                 |
| Group Name, DT Directory, Common Library Project Name, Branch name **no value** | Invalid value caught early. Cannot save, appropriate feedback of invalid form fill out. | ❌ Same as Branch invalid case.                                                                                                                                                                                                                        | Change Group Name, DT Directory, Common Library Project Name, Branch name to the empty string.                                                                                                                                      |

**Summary:**
Changing to valid settings works. Invalid settings in the best case display an
error in the HTML (no cache) and otherwise shows stale twins.

**Problems:**

- Stale state maintained after settings are updated unless page is refreshed.
- Displaying technical errors to the user when the settings are invalid.
- Permitting invalid values such as empty strings when they are required
- No tags runners may not work, but possibly local problem.
- Private twins show up as common twins

## ⏳ Concurrent Execution

| Expected behaviour                          | Observed behaviour  | Test method                               |
| ------------------------------------------- | ------------------- | ----------------------------------------- |
| Both twins run successfully simultaneously. | ✅ Same as expected. | Run the same twin twice at the same time. |
| All twins run successfully simultaneously.  | ✅ Same as expected. | Run different twins at the same time.     |

### Concurrent Execution Across Different Runners

| Expected behaviour                                                                                     | Observed behaviour  | Test method                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Both twins run successfully simultaneously. They report the correct runner name in the Execution logs. | ✅ Same as expected. | Set up 2 ubuntu GitLab runners with different tags. Change Runner Tag to first runner's tag. Execute twin. Change Runner Tag to second runner tag. Execute another twin. |
| History stays after editing, it is still executing.                                                    | ✅ Same as expected. | Execute → Edit settings → Execute. Check – is history still there? Does it look correct?                                                                                 |

**Summary:**

All functionality works according to the tests. The logs are still
there after changing settings and running any combination of twins
and runners work (Only Ubuntu runners tested).

## 🧩 Implementing Backends

The DTaaS is by default set up to work with GitLab as execution and
storage backend, but other combinations may be more suitable. As
such, the code base is designed with this flexibility in mind, so
reimplementation from scratch is not required when a new backend is needed.
In future versions of the DTaaS, more backends may be available by
default, such as GitHub and Azure.

## 💭 Summary

Digital Twins can be queued as needed and live settings changes
will not interfere with data retention, while enabling the testing of
multiple setups simultaneously. For greater
flexibility, those with the requisite technical expertise can readily
expand upon the available backends.
