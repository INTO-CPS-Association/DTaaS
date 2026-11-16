# 17c Fidelity as a Declared Parameter

## Spec

_Resource_ adaptation trades accuracy for computational cost, for
example by switching between multi-fidelity models, and a DT
Orchestrator adjusts the fidelity of DTs to the current needs and
constraints of a DTN. Both need a DT that can run
at more than one fidelity, and a Manager that can ask it to. 04 already
gives the means: a controllable parameter, its value in
`DT_PARAM_<NAME>` (08), and an event that restarts a script (D22). 17a
gives the Manager the figures to see the effect. What is missing is a
name and a shape that every DT author and every Manager can agree on.
This issue documents that convention and adds no code to the runner.

### The convention

1. A DT that can trade accuracy for compute declares a parameter named
   `fidelity`, of type `enum`, with `controllable: true`, a `default`
   and an `event`.
1. The DT author chooses the `values`. They are listed from the
   cheapest to the most accurate, so a Manager that knows no names can
   step one value down or up (this plan's call).
1. The event, by custom `fidelity-changed`, has a `stop: true`
   self-transition in each state whose script must restart to apply a
   new value. In other states the new value applies at the next script
   start (S6).
1. Scripts read `DT_PARAM_FIDELITY` and choose a model, a step size or
   a sample rate from it.
1. The runner treats `fidelity` as any other parameter: nothing in the
   runner knows the name.

### Example

```yaml
events:
  - fidelity-changed
parameters:
  fidelity:
    type: enum
    values:
      - low
      - medium
      - high
    default: medium
    controllable: true
    event: fidelity-changed
states:
  simulate:
    transitions:
      fidelity-changed:
        state: simulate
        stop: true
```

A shell script chooses a step size and `exec`s the model, so the model
is the runner's direct child: a stop reaches it, and 17a measures it.

```sh
#!/bin/sh
case "$DT_PARAM_FIDELITY" in
  low) step=60 ;;
  high) step=1 ;;
  *) step=10 ;;
esac
exec ./simulate --step "$step"
```

On Windows the runner ends `powershell.exe` and not the processes it
started (Stop a Script in `STATE-MACHINE.md`), so a PowerShell script
does its work in its own process and loops on short steps:

```powershell
$step = @{ low = 60; medium = 10; high = 1 }[$env:DT_PARAM_FIDELITY]
if ($null -eq $step) { $step = 10 }
while ($true) { Update-Model -Seconds $step; Start-Sleep -Seconds 1 }
```

`Update-Model` stands for the DT's own code.

### How a Manager uses it

- It finds the DTs that offer the trade in `GET /parameters`: a
  controllable `enum` named `fidelity`, whose `values` give the order.
- It sheds load with `PUT /parameters` `{"fidelity": "low"}`, or the
  MQTT `set-parameters` route. The runner stores the value, raises
  `fidelity-changed`, and the self-transition restarts the script as a
  new entry with `DT_PARAM_FIDELITY=low`. `GET /state` shows the new
  entry; the reply of `PUT` does not depend on the event (04).
- It sees the effect in 17a's CPU time and peak memory of the script's
  command, in `GET /` and the history, before and after the change, and
  over time in 11's metrics once 11 is built.
- With a `database`, the value survives a runner restart (09), so a DT
  stays at the fidelity the Manager chose.

An event in a state without the self-transition is refused and logged
at debug level; a parameter event does not escalate with
`onNoTransition`, which covers client events only (06). Until 17b, 17a
measures the direct child only, which is why the shell example uses
`exec`.

### Why a convention and not a built-in

Placement and resource scheduling of DTs are left to the platform, not
to the Manager. The runner reports and obeys; it does not
decide. R4 keeps each DT's local policy its own: only the DT author
knows which models exist and what each costs. A reserved parameter name
with behaviour in the runner would be a built-in policy, and the
existing parameter, event and environment mechanisms already carry
everything the convention needs.

### Considered and set aside

- **A reserved `fidelity` parameter** that the runner validates or
  adds: it fixes the values for every DT and puts policy in the runner.
- **Automatic switching by the runner**, lowering fidelity when CPU or
  memory crosses a threshold: that is the Manager's or orchestrator's
  decision (S1, non-goal of runner-side policy), and it would restart
  scripts unasked (S6).
- **A resource budget that refuses to start scripts**: admission
  control belongs to the platform that places DTs, and a refused state
  script would leave the machine in a state without its work.
- **Adding `fidelity` to the hospital demo**: issue 16 records the demo
  again, and a bed-management DT has no model to trade. The test state
  machine carries a runnable example instead (this plan's call).

## Plan

1. Read 17a as merged: the names of its CPU and memory fields in
   command results, `GET /` and the history, and the Windows behaviour
   of its measurement. The guide quotes them as they are.
1. `STATE-MACHINE.md`: a new section `## Pattern: Fidelity` at the end,
   after the hospital example, as it combines Parameters, Stop
   Transitions, Environment and 17a's figures (this plan's call). It
   holds the rules, the YAML, the two script fragments, the Windows
   note, and the Manager's requests with what 17a shows. One sentence
   at the end of `### Parameters` points to it.
1. `README.md`: one sentence at the end of `### Parameters` linking the
   guide's section. The user documentation copy of the README is listed
   in the pull request for a separate change.
1. `api/API.md`: one sentence in `## Parameters` that no parameter name
   has a meaning to the runner, with `fidelity` as the example and a
   link to the guide (this plan's call: a Manager author reads API.md).
1. `test/data/scripts/state-machine.yaml`: the `fidelity` parameter of
   the example, `fidelity-changed` in `events` and a `stop: true`
   self-transition on `execute`, in block mappings. `print-context`
   does not change: its e2e test uses its own definition, and
   `DT_PARAM_<NAME>` is already tested for any name (this plan's call).
   `api/*.http` do not change; the `PUT /parameters` request shows the
   route.
1. `test/unit/fsm.definition.spec.ts` (239 lines): the test that reads
   the test state machine also expects the `fidelity` declaration, so
   the documented example is checked by the loader. It stays under 250.
1. `docs/state-machine-design.md`: one sentence appended to 17a's
   decision row: fidelity is a DT author's convention on a declared
   parameter (17c), and the runner reserves no parameter name.
1. `docs/issues/README.md`: the status row of 17c. No version change.

## Tasks

- [x] `STATE-MACHINE.md` has `## Pattern: Fidelity` with the rules,
      YAML, shell and PowerShell fragments and the Manager's view, and
      `### Parameters` links it. Check: the section, read against 17a's
      field names.
- [x] `README.md` links the section from `### Parameters`. Check: the
      sentence and the anchor `#pattern-fidelity`.
- [x] `api/API.md` says no parameter name is reserved. Check: the
      sentence in `## Parameters`.
- [x] The test state machine declares `fidelity`, and the loader
      accepts it with the declaration of the example. Check:
      `test/unit/fsm.definition.spec.ts`.
- [x] The design document carries one sentence under 17a's decision.
      Check: the row in `docs/state-machine-design.md`.
- [x] Documents pass the linters. Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on the changed
      Markdown files, and `npx prettier --check` on them and the YAML.
- [x] The suite passes with the changed test data. Check:
      `yarn test --maxWorkers=2`.

## Learnings

- **Drift.** The references held: `### Parameters` of
  `STATE-MACHINE.md` and of `README.md`, `## Parameters` of
  `api/API.md`, and 17a's decision, D33. 17a's figures are as the plan
  read them: `resources` with `cpuSeconds` and `peakRssBytes` on the
  result of `POST /`, on `GET /`, on each record of `GET /history` and
  by command name in `GET /metrics`. `test/unit/fsm.definition.spec.ts`
  had 239 lines; the two checks took it to 250 as prettier splits the
  check of the transition, so the transition is read into a `restart`
  constant first, and the file has 248.
- **When a Manager sees the effect.** 17a reports a run's figures when
  it ends: `null` on `GET /` and in its record of `GET /history` while
  it runs. `GET /` shows only the latest run, so the Spec's "in `GET /`
  ... before and after the change" holds for the history only: the run
  at the old fidelity ends `stopped` with its figures, and the run at
  the new one shows its figures at the next change or stop. CPU time
  grows with the length of a run, so the guide divides `cpuSeconds` by
  the time from `receivedAt` to `finishedAt`. 11 is built, and its
  `GET /metrics` sums the runs of a command whatever their fidelity, so
  the guide names it for the load over time, not for one change.
- **Independent of 17b.** The guide does not say which processes the
  runner measures; it links the README's Resources section, which 17b
  updates. `exec` is justified in terms that hold either way: the
  model is then the script's own process, which a stop reaches and
  which counts whether the runner measures the direct child or the
  tree. The Windows note says only that PowerShell's own figures are
  included, which holds for both.
- **Checked in the code.** An event raised by `PUT /parameters` goes
  through `raiseAll` of `src/fsm/requests.ts`, which logs a refused one
  with `logStay` at debug level and does not call
  `escalations.noTransition`, so the Spec's statements on logging and
  `onNoTransition` hold. A run that a `stop: true` transition stops is
  stored as `stopped` with `exitCode` `null` (`src/execa-runner.ts:67`).
- **Sweep beyond the plan.** `DEVELOPER.md` said the test state
  machine declares two parameters; it now names three, with a link to
  the pattern. The status column of
  [DT Networks][dtn] is left to the
  documentation sweep that has kept it, as widening its cell would
  realign the whole table under 17b and 18. The user documentation
  copy of the README, `docs/user/servers/execution/runner/readme.md`,
  is left for a separate change, as the plan says.
- **No decision number.** The plan appends one sentence to 17a's D33
  rather than adding a decision: a convention adds no mechanism to
  decide on, so 17c takes no D number. No version change.
- **Linters.** markdownlint reports MD013 at `README.md:1584`, a line
  of the MQTT section that is 83 characters at the merge base too; it
  is left for a separate change.

[dtn]: ../../../../../system/servers/execution/runner/DT-networks.md
