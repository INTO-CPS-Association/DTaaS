# Research: sandbox-runtime for the Runner's Scripts

Should the runner start the scripts it executes inside Anthropic's
sandbox-runtime (`srt`)? This file gathers the facts and leaves the
decisions open. The decisions are listed at the end.

All web sources were read on 2026-10-26, against
`@anthropic-ai/sandbox-runtime` 0.0.81. Repository citations give
`file:line` under `servers/execution/runner/` at commit `6a97d11c`.
Statements marked _inference_ are this document's reasoning, not
something a source says.

## Sources

- **README**: the README of
  <https://github.com/anthropics/sandbox-runtime>, which is
  byte-identical to the one in the npm tarball of 0.0.81.
- **tgz**: the files of
  <https://registry.npmjs.org/@anthropic-ai/sandbox-runtime/-/sandbox-runtime-0.0.81.tgz>,
  read but not run. The key lines were compared with `src/sandbox/*.ts`
  on `main`.
- **npm**: <https://registry.npmjs.org/@anthropic-ai/sandbox-runtime>.
- **#N**: issue or pull request N of the repository above.
- **eng**: <https://www.anthropic.com/engineering/claude-code-sandboxing>.
- **CC**: <https://code.claude.com/docs/en/sandboxing>.
- **Docker**: <https://docs.docker.com/engine/security/seccomp/>.
- **bwrap**: <https://github.com/containers/bubblewrap>, `bwrap.xml`.

## Summary

- srt restricts the filesystem and the network of a process tree, and
  nothing else. It sets no CPU, memory, process-count or time limit.
- On Linux it uses bubblewrap namespaces, a seccomp filter and a proxy
  on the host for all egress. On macOS it uses Seatbelt. On Windows,
  where it is labelled alpha, it runs the process as a separate local
  user behind a firewall filter.
- It is a pre-1.0 "Beta Research Preview". It has had 77 releases since
  2025-10-20, all `0.0.x`, about one a week, and 0.0.80 changed its
  behaviour.
- Its network model fits HTTP clients that honour the proxy variables.
  It allows no UDP and no direct connections. By default it also blocks
  the loopback and private-range addresses that the runner's scripts
  use.
- On Linux a SIGTERM to the sandbox turns into a SIGKILL of the whole
  sandbox, which defeats the grace period of D18.
- Inside the runner's container it needs bubblewrap, socat and ripgrep,
  and a looser seccomp profile than Docker's default. No source
  documents a set of container flags that works.
- On Windows the caller's environment and stdin do not reach the
  script (#772 and #648, both open). The runner passes its context to
  scripts through exactly those two channels.

## What sandbox-runtime Is

### Purpose and Threat Model

srt was released with Claude Code's sandboxing on 2025-10-20. Its job
is to contain an AI agent whose commands a prompt injection may steer:
"even a successful prompt injection is fully isolated", and a
compromised agent "can't steal your SSH keys, or phone home to an
attacker's server" [eng]. The docs require both layers, "Effective
sandboxing requires both filesystem and network isolation", and warn
that "Sandboxing reduces risk but is not a complete isolation
boundary" [CC].

The README lists these limitations [README, Security Limitations]:

- The proxy filters by domain and does not inspect TLS unless
  configured to, so domain fronting can get through.
- A broad allowed domain can carry data out.
- An allowed Unix socket such as `docker.sock` lets a process escape.
- A broad write path can lead to privilege escalation.
- `enableWeakerNestedSandbox` "considerably weakens security".

### Mechanisms per Platform

| Platform        | Filesystem                                                | Network                                                                                 | Other                                                                                                        |
| :-------------- | :-------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| Linux, WSL2     | bubblewrap bind mounts, read-only or read-write           | `--unshare-net`, so no interfaces; socat relays to an HTTP and SOCKS5 proxy on the host | `--unshare-pid`, `--unshare-user`, `--cap-drop ALL`; seccomp blocks `AF_UNIX`, `io_uring` and new namespaces |
| macOS           | `sandbox-exec` with a generated Seatbelt profile          | only the proxy's localhost port                                                         | `allow signal (target same-sandbox)`                                                                         |
| Windows (alpha) | write-restricted token, explicit ACEs on the working tree | Windows Filtering Platform filter keyed on the sandbox account's SID                    | runs as the local user `srt-sandbox`, inside a job object                                                    |
| WSL1, others    | none                                                      | none                                                                                    | `initialize()` throws `Sandbox dependencies not available`                                                   |

Sources: the README sections "How It Works", "Unix Socket Restrictions
(Linux)" and "Windows (alpha)"; in the tgz,
`dist/sandbox/linux-sandbox-utils.js`, `macos-sandbox-utils.js`, and
`isSupportedPlatform` in `sandbox-manager.js`. Landlock appears nowhere
in `dist/`, so srt does not appear to use it (_inference_).

Reads are allowed by default, and `denyRead` lists the exceptions.
Writes and the network are denied by default, and `allowWrite` and
`allowedDomains` list the exceptions [README, Dual Isolation Model].

### Interface

- **Library.** `SandboxManager` is a process-wide singleton: one
  configuration, which each command can override [tgz
  `dist/index.d.ts`].
  - `initialize(config, …)` starts the proxies.
  - `wrapWithSandbox(command, binShell?, customConfig?, abortSignal?)`
    returns a shell string, and the caller spawns it. The README's
    example passes it to `spawn(…, { shell: true })`. It throws on
    Windows.
  - `wrapWithSandboxArgv(…)` returns `{ argv, env }`. On Linux and
    macOS, `argv` is `[bash, '-c', <wrapped string>]`. It is the only
    form that works on Windows.
  - The caller must call `cleanupAfterCommand()` after each command
    exits, to remove the mount points on Linux.
- **CLI.** `srt [--settings path] [-c "cmd"] cmd args…`. The settings
  file defaults to `~/.srt-settings.json` [README].
- **Configuration.** The top-level keys include `network`,
  `filesystem`, `credentials`, `enableWeakerNestedSandbox`,
  `allowNestedUserNamespaces`, `seccomp` and `windows` [tgz
  `dist/sandbox/sandbox-config.js`].
  - `network` holds `allowedDomains` (each with an optional `:port`),
    `deniedDomains`, `allowUnixSockets`, `allowLocalBinding`,
    `httpProxyPort` and `socksProxyPort`.
  - `filesystem` holds `denyRead`, `allowRead`, `allowWrite` and
    `denyWrite`.
- **Quoting.** Two shells interpret the command: the caller's spawn
  first, then `bash -c` inside the sandbox (_inference_ from
  `buildSandboxCommand`). The CLI quotes its arguments for this reason
  (#157).

### Maturity

- 0.0.81 was published on 2026-10-20, under Apache-2.0, and needs Node
  `>=22.12.0` [npm].
- It depends on `zod ^3.25.0`, `commander ^12.1.0`, `node-forge ^1.4.0`
  and `@pondwader/socks5-server ^1.0.10`. It bundles prebuilt
  `apply-seccomp` binaries for x64 and arm64, `srt-win.exe` and a Java
  agent, 11.4 MB unpacked [npm]. The runner depends on zod 4 and
  commander 15 (`package.json:57-73`), so both packages would be
  installed twice (_inference_).
- The README labels it a "Beta Research Preview", and warns that its
  "APIs and configuration formats may evolve".
- All 77 releases are `0.0.x`, about one a week. 0.0.80 (2026-10-16)
  began to block nested user namespaces [npm `time`; GitHub release
  v0.0.80]. The project keeps no CHANGELOG file.
- On 2026-10-26 the repository had 136 open issues and 169 open pull
  requests, and npm listed 15 maintainers, all with `anthropic.com`
  addresses. The repository moved there from
  `anthropic-experimental/sandbox-runtime`.

## How It Meets the Runner's Needs

### Running Inside the Runner's Container

The runner's image is `node:26.10.0-slim` and runs as `node`, uid 1000
(`developer/check/runner.dockerfile:12,18`). Nothing under `deploy/`
starts the runner. People run it from `npm install -g`, or through
`compose.runner.yml` with Docker's default security options.

- srt needs `bwrap` 0.4.0 or later, `socat` and `rg`, and does not
  initialise without them [README; tgz `checkLinuxDependencies`]. The
  runner's image has none of the three.
- Docker's default seccomp profile lets a process create a user
  namespace. It denies `mount`, `setns` and the other namespace flags
  unless the container holds `CAP_SYS_ADMIN` [Docker]. bubblewrap
  mounts inside its namespace, so the default profile probably stops it
  (_inference_).
- Reports from inside containers:
  - #180 (open): `node:20` fails with "Creating new namespace failed:
    Operation not permitted", even with `enableWeakerNestedSandbox`.
  - #417 (open since 2026-07-22, no maintainer reply): with a custom
    seccomp profile, `apply-seccomp` still fails to write its
    `uid_map`, and `enableWeakerNestedSandbox` "does not resolve it".
  - #429 and #498 (both open): Ubuntu's AppArmor restriction on user
    namespaces stops the seccomp helper.
- The project's own Docker test runs as root, with
  `--security-opt seccomp=unconfined --security-opt apparmor=unconfined`
  and `enableWeakerNestedSandbox` [`.github/workflows/integration-tests.yml`
  and `test/docker-weak-sandbox.test.ts` on `main`].
- `enableWeakerNestedSandbox` binds the container's `/proc` instead of
  mounting a fresh one, which "exposes process information to
  sandboxed commands" [CC; tgz].

_Inference_: to run srt, the runner's container would need at least a
looser seccomp profile, probably a looser AppArmor profile, and the
weaker nested mode. Each of these weakens the container, the wall
between the runner and the rest of the host, to build a weaker wall
inside it.

### Network: the Physical Twin and the Runner's Own API

- Scripts reach the runner at `RUNNER_URL`, which is always
  `http://127.0.0.1:<port>` (`src/fsm/script-context.ts:150-158`).
  They raise events and escalate through it (README, Raising Events
  From Scripts). Under 15a they also send `RUNNER_TOKEN` there.
- Under srt on Linux, all egress goes through the host proxy. A client
  must honour `HTTP_PROXY` or `ALL_PROXY`, which point at the relay
  inside the sandbox; a client that does not may be "unable to connect"
  [README, Known Limitations].
- srt always sets
  `NO_PROXY=localhost,127.0.0.1,::1,169.254.0.0/16,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16`
  [tgz `dist/sandbox/sandbox-utils.js:705-721`]. A client that honours
  it dials those addresses directly, from a namespace with no route
  out, and fails. That includes `curl` against `RUNNER_URL` and against
  a device on a LAN address. PR #769 (open since 2026-10-23) would drop
  the private ranges from `NO_PROXY`; 0.0.81 does not include it.
- On Linux, `allowLocalBinding` is "ignored — the sandbox has its own
  network namespace, whose loopback is always usable and is not the
  host's" [README:462]. A script reaches the host's loopback only when
  `allowedDomains` lists `127.0.0.1:<port>` and the request goes
  through the proxy [README:468].
- Non-HTTP TCP, such as MQTT on port 1883, passes only through SOCKS5
  or HTTP `CONNECT`, so the client must support a proxy [README]. The
  SOCKS server handles only `connect`, because srt never enables `udp`
  or `bind` [tgz; `@pondwader/socks5-server` README]. So there is no
  UDP: no CoAP, no OPC UA discovery, no multicast (_inference_). PR #450
  (open) proposes an explicit host-network mode for UDP and LAN
  traffic.

### Resource Limits

srt neither limits nor measures resources.

- No file in `dist/` mentions `cgroup`, `rlimit`, `prlimit`, `ulimit`,
  `memory.max` or `pids.max` [tgz].
- The README describes no limit.
- On Windows the job object sets only `KILL_ON_JOB_CLOSE`
  [`vendor/srt-win-src/src/job.rs` on `main`].

### Process Management and the Stop Path

- The runner starts each script with execa and keeps the subprocess
  (`src/execa-runner.ts:41-48`). A stop calls execa's `kill()`, which
  sends SIGTERM, then SIGKILL after `stopGrace` (`:42`, `:69`; D18).
  On Windows a stop is `TerminateProcess` of `powershell.exe`, and the
  processes the script started keep running (10-stop.md, Learnings).
- Under srt on Linux the process tree is
  `sh → bwrap → bwrap → bash → {socat, socat, apply-seccomp →
apply-seccomp → script}`. The helper is PID 1 of a nested PID
  namespace [#603; README].
- bwrap runs with `--new-session --die-with-parent`
  [tgz `linux-sandbox-utils.js:2891`]. When bwrap or its parent dies,
  `--die-with-parent` SIGKILLs every process in the sandbox [bwrap].
  A group SIGINT "never reaches the command. The outer `bwrap` … dies
  on it" [#603].
- So execa's SIGTERM to the outer process becomes a SIGKILL of the
  script, with no grace period (_inference_). In exchange the whole
  sandboxed tree dies, which is the tree kill that 17b set aside.
- bwrap returns the exit status of its initial process [bwrap], and
  srt's wrapper keeps it. A script killed by a signal therefore shows
  up as the shell's exit code `128+n` (_inference_).
- `initialize()` adds `process.once('SIGTERM', …)` and
  `process.once('SIGINT', …)` handlers to the runner's own process.
  They tear down the proxies [tgz `sandbox-manager.js:274-275`]. The
  runner enables Nest's shutdown hooks (`src/main.ts:30`) and, at
  shutdown, waits for the commands in progress (DOCKER.md). While it
  waits, the running scripts would lose their network (_inference_).
- A SIGKILL leaves mount-point files on the host, and "nothing removes
  them later" [README; #139 open].
- The processes in the nested PID namespace keep their host PIDs, so
  the runner can read them in `/proc` (_inference_: #603's `ps` listing
  was taken from outside the sandbox). 17a's direct child would become
  `sh` or `bwrap`, so 17a would measure the wrapper, and only 17b's
  tree would reach the script.

### Overhead per Spawn

No source measures it. What runs at each stage:

- Once per `initialize()`: a proxy port and a socat bridge on the host,
  and on Windows a firewall probe.
- For each wrap on Linux: ripgrep searches up to three levels deep for
  the files that must always be denied. "The wrap can take seconds over
  a large tree" [README; `dist/cli.js`].
- For each spawn on Linux: two bwraps; two socats inside the sandbox,
  with a wait loop of at most about 0.3 s; and the seccomp helper.
- On Windows: the first grant on a user profile takes "minutes on a
  large profile" [README].

### Windows and the Demo

- srt on Windows needs a one-time elevated `windows-install`, which
  creates the `srt-sandbox` user and machine-wide firewall filters
  [README].
- PowerShell's `Invoke-WebRequest` and `Invoke-RestMethod` cannot reach
  HTTPS from inside it [README, Known limitations].
- The demo's `Send-Runner` calls `RUNNER_URL` with `Invoke-RestMethod`
  over plain HTTP (`demo/hospital/scripts/ward.ps1:56`). Plain HTTP to
  loopback works only after `windows-install --allow-loopback`, which
  opens loopback for the whole machine [README, Local servers on
  Windows].
- Only `PATH`, the proxy variables and the git variables reach the
  child. `RUNNER_URL`, the `DT_*` variables and the declared
  environment would not [#772, open against 0.0.81].
- stdin is not relayed, so 05's command input would read as end of
  file [#648, open].
- Claude Code itself does not sandbox on native Windows: "On native
  Windows, Claude Code runs commands unsandboxed. To use the sandbox on
  a Windows machine, run Claude Code inside a WSL2 distribution" [CC].
- A script that runs as another user inside a job object may be
  beyond what a non-admin runner can measure (17a, 17b) or stop
  (_inference_).

## The Runner's Position

- The runner executes only the commands that `runner.yaml` lists and
  that have a script in its scripts directory
  (`docs/developer/codebase/runner.md`, Security Considerations). The
  DT author writes the scripts.
- Callers choose which script runs, the JSON on its stdin (05), and the
  parameter values that become `DT_PARAM_*` variables (04).
- Today anyone who reaches the API can do so (A8). Under 15a, callers
  must be named principals with roles, and a Manager can call only the
  `manager.commands`.
- One runner serves one DT, as one process (S2).
- The runner reports resource use and decides nothing (17a, S14).
- An open DT network needs protection against both external
  malevolent parties and the introduction of malevolent DTs
  ([DT Networks](DT-networks.md), item 15).
- The delivery rules admit no new dependency without need and cap
  files at 250 lines (`docs/issues/README.md`). S15 keeps even `jose`
  out until it is needed.

### What a Script Can Reach Today

A script runs as the runner's user, so it can do whatever that user
can (_inference_ from `src/execa-runner.ts:41-48`, which spawns with no
isolation). For a script that a caller has subverted through its input,
that includes:

- **Read `runner.yaml`.** It can hold the MQTT broker's `username` and
  `password` (`src/mqtt/mqtt.config.ts:18-19`). With these the script
  can act as the runner on the broker.
- **Read the private key of 15b.** 15b's `auth.key` names a file that
  the runner must be able to read (15b-signed-output.md).
- **Write the database.** The `database` file of DOCKER.md holds the
  command history and the persisted machine (09).
- **Rewrite the scripts directory,** wherever the runner's user may
  write to it.
- **Read the environment and command line of the runner process**,
  through `/proc/<pid>/environ` and `/proc/<pid>/cmdline`, since both
  run as the same user (_inference_).
- **Reach the network** without limit, and call the runner's API in
  role `script` with `RUNNER_TOKEN` (15a).

## Network Configurability, in Detail

The owner asked whether an operator could turn the network part on or
off per runner. From the 0.0.81 source:

- **Network isolation can be left off while the filesystem stays
  isolated.**
  - `wrapWithSandbox` restricts the network only when the global or the
    per-command configuration defines `network.allowedDomains`
    [tgz `sandbox-manager.js:1924-1938`]. An empty array means no
    network, but an absent one means no restriction.
  - Without the restriction, bwrap is not given `--unshare-net`, and
    the command is not routed through the socat relays
    [tgz `linux-sandbox-utils.js:2961-2964`, `:3108-3119`]. The script
    then shares the host's (or the container's) network: loopback,
    `RUNNER_URL`, LAN addresses, UDP and raw TCP all work as they do
    today (_inference_ from the absence of a network namespace).
  - Filesystem binds, `--unshare-pid`, `--unshare-user`,
    `--cap-drop ALL` and the seccomp filter still apply
    [`:3021-3058`, `:3115-3117`]. The seccomp filter blocks Unix-domain
    sockets unless `allowAllUnixSockets` is set [README, Unix Socket
    Restrictions].
- **That mode is not documented, and the types do not admit it.**
  - The schema makes `network.allowedDomains` a required array
    [tgz `sandbox-config.js:584-588`, `:993`]. The CLI validates its
    settings file against that schema [tgz `utils/config-loader.js:13`],
    so the CLI cannot express this mode.
  - The library does not validate its argument, so the mode is
    reachable only by passing a configuration that its TypeScript type
    refuses.
  - `initialize()` starts the proxy and the socat bridge whatever the
    wraps later need [tgz `sandbox-manager.js:1131-1173`], so socat
    stays a requirement.
  - The README says "Both filesystem and network isolation are required
    for effective sandboxing" [README:115].
- **The documented host-network mode is not merged.** PR #450 (open,
  2026-08-05, no review) adds `network.hostNetwork`, "for trusted
  workloads that need normal host IP semantics while retaining
  filesystem and Unix-domain-socket policy". On Linux it omits
  `--unshare-net` and starts no proxy.
- **With network isolation on, per-host bypasses are not possible.**
  - `NO_PROXY` is fixed by srt and is not configurable
    [tgz `sandbox-utils.js:705-721`]. It names hosts that are not
    proxied, which inside the network namespace means hosts that cannot
    be reached at all.
  - `allowedDomains` only decides what the proxy will dial. An IP
    literal such as `127.0.0.1:5000` opens the host's loopback, but
    only through the proxy [README:468].
- **With network isolation on, UDP and raw sockets are not possible.**
  The SOCKS server handles only `connect`, and the namespace has no
  interfaces (see Network above).

In short, the operator's choice is all or nothing. Either network
isolation is off and the script uses the network as it does today, or
it is on and the script gets proxied TCP to listed hosts only. Today
the "off" setting depends on an undocumented code path, until #450 or
something like it is merged.

## Container Profiles, in Detail

The owner asked what Docker's defaults block, what the weaker mode
gives up, what an attacker gains, and whether there is a middle way.

### What the Defaults Block That srt Needs

| srt needs                                                | Docker's default blocks it with                                                                                                                                                                                      | Source                         |
| :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| A user namespace (`--unshare-user`)                      | nothing: seccomp allows `CLONE_NEWUSER` and `unshare --user`. A host with `kernel.apparmor_restrict_unprivileged_userns=1` (Ubuntu 24.04 and later) denies capabilities in it unless an AppArmor profile grants them | Docker; README; Ubuntu spec    |
| PID, mount and network namespaces, `setns`, `pivot_root` | seccomp: `clone` and `unshare` with namespace flags, and `setns`, are "gated by CAP_SYS_ADMIN", which the container lacks                                                                                            | Docker                         |
| bind mounts and a fresh `/proc` inside the namespace     | seccomp: `mount` "already gated by CAP_SYS_ADMIN"; AppArmor `docker-default`: `deny mount,`                                                                                                                          | Docker; moby AppArmor template |
| a fresh `/proc` (`--proc /proc`)                         | fails "even when the container has CAP_SYS_ADMIN"; the kernel refuses a new procfs while parts of `/proc` are masked (_inference_: Docker masks `/proc/kcore`, `/proc/keys` and others)                              | #214                           |
| the nested namespace of `apply-seccomp` (uid map write)  | fails without `CAP_SYS_ADMIN` even with a custom seccomp profile, for a root caller                                                                                                                                  | #417                           |

Sources: Docker's seccomp page, rows `clone`, `unshare`, `mount` and
`setns`; `apparmor/template.go` of <https://github.com/moby/profiles>;
<https://discourse.ubuntu.com/t/spec-unprivileged-user-namespace-restrictions-via-apparmor-in-ubuntu-23-10/37626>.

### What `enableWeakerNestedSandbox` Gives Up

- The script sees the container's `/proc` in place of its own [tgz
  `linux-sandbox-utils.js:3055-3058`]. So it sees every process in the
  container, the runner included. For processes of the same user, it
  can read their command lines and environments (_inference_ from the
  kernel's same-uid rule for `/proc/<pid>/environ`). This is the leak
  that `--unshare-pid` with a fresh `/proc` exists to stop: "If we don't
  have --proc, it is possible to read host /proc and leak information"
  [tgz `:3036-3038`].
- The fallback that stops nested user namespaces, bwrap's
  `--disable-userns`, needs it off. With the weaker mode on and no
  seccomp helper, "nothing limits namespaces" [README:717].
- The README calls the result "considerably" weaker, for use "only …
  where additional isolation is otherwise enforced" [README:1278].

### What an Attacker in the Container Gains

Compared with today's defaults, for code running as the runner's user
anywhere in the container (the runner process itself, or a script
before or outside the inner sandbox):

- **`seccomp=unconfined`.** The attacker can create network and mount
  namespaces inside a user namespace, which gives `CAP_NET_ADMIN` and
  `CAP_SYS_ADMIN` over them. Those are the kernel paths behind
  CVE-2022-0185 (mount), CVE-2022-1015, CVE-2022-2078 and
  CVE-2022-25636 (netfilter), and CVE-2020-14386 (`AF_PACKET`). Ubuntu
  lists them as privilege escalations that unprivileged user namespaces
  made "easy" [Ubuntu spec]. The attacker also gets every other call
  that Docker's profile blocks, such as `keyctl`, `add_key`,
  `userfaultfd` and `perf_event_open` [Docker]. A kernel exploit
  escapes the container, and with it the boundary between users that
  Q2 settled.
- **`apparmor=unconfined`.** The `deny mount` rule and the deny rules
  on `/proc/sys`, `/proc/sysrq-trigger` and `/sys` go
  [moby AppArmor template]. Capabilities still guard most of these for
  a non-root user, so this layer is defence in depth rather than the
  only wall (_inference_).
- **`systempaths=unconfined`.** `/proc/kcore`, `/proc/keys`,
  `/proc/timer_list` and the other masked paths become visible
  (_inference_ from Docker's masked-path list; the option's name says
  it turns that confinement off).
- Inside srt's own sandbox, the script is held tighter than Docker's
  default on namespaces: srt's seccomp filter refuses `unshare` and
  `clone` with user or mount namespace flags, and `setns`, `mount`,
  `umount2` and `pivot_root` [README:713]. It does not cover
  `keyctl`, `userfaultfd` or `perf_event_open` (_inference_ from the
  same list). So the loosened profile exposes the runner process
  itself more than it exposes the sandboxed script.

### Middle Paths

| Path                                                                                                                                    | Status                                                                                                                                                                                                                                                                                                                                   |
| :-------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A custom seccomp profile: Docker's default plus `mount`, `umount2`, `pivot_root`, `setns`, and namespace flags on `clone` and `unshare` | Narrower than `unconfined`, but it opens the namespace calls behind the CVE class above, which is most of the gain. It also needs a custom AppArmor profile (because of `deny mount`), plus `systempaths=unconfined` or the weaker mode. #417 shows it still failing for a root caller. No source shows it working for a non-root caller |
| `--security-opt systempaths=unconfined` alone                                                                                           | Addresses only the `/proc` mount. Seccomp and AppArmor still stop bwrap                                                                                                                                                                                                                                                                  |
| A privileged sidecar                                                                                                                    | bwrap must start the script itself, in the runner's container. A sidecar can run the proxy (`network.httpProxyPort` takes an external one) but not the sandbox, so it does not help (_inference_)                                                                                                                                        |
| A rootless engine (rootless Docker or Podman)                                                                                           | The container already runs inside a user namespace. #498 (open) reports `apply-seccomp` aborting there                                                                                                                                                                                                                                   |
| No container: the runner on the host, from `npm install -g`, as a plain user                                                            | srt works as documented. On Ubuntu 24.04 and later it needs the AppArmor allowance or the sysctl of the README. The host user account becomes the outer boundary (Q2)                                                                                                                                                                    |
| A stronger container runtime (gVisor, Kata) without srt                                                                                 | An alternative to srt rather than a way to host it: it isolates the whole container, scripts included, from the host kernel (_inference_; not researched further)                                                                                                                                                                        |

## Alternatives the Assessment Compares

| Option                   | Isolates                                                                                | Cost to the runner                                                                                                   | Source                                             |
| :----------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| Nothing new              | the runner's container or user account; 15a decides who may call                        | none                                                                                                                 | DOCKER.md, 15a                                     |
| The container, hardened  | read-only root, `cap_drop: ALL`, `no-new-privileges`, `mem_limit`, `pids_limit`, `cpus` | compose keys only; the limits cover the runner and the scripts together                                              | Docker compose reference                           |
| A container per script   | everything, with limits per script                                                      | needs a Docker socket or a rootless engine; the runner's context, network and stop would all need a redesign         | _inference_                                        |
| bubblewrap directly      | what srt does on Linux, without the proxy                                               | the same container privileges as srt; Linux only; the network stays open unless a network namespace is added         | bwrap                                              |
| cgroups v2 per script    | CPU, memory and process-count limits, with exact accounting                             | a delegated cgroup subtree, which 17b found rarely available                                                         | 17b, Considered and Set Aside                      |
| seccomp only             | system calls                                                                            | a filter or a native addon; stops neither file reads nor network access                                              | _inference_                                        |
| Windows Job Objects      | limits, and a kill of the whole tree, on Windows                                        | a native addon; assigning the job races the script's first children                                                  | 17b, Considered and Set Aside                      |
| srt as an opt-in         | filesystem and HTTP egress, with the limits above                                       | a dependency, a platform split, a new stop path and the network exceptions                                           | this file                                          |
| Firecracker as an opt-in | the scripts in a KVM guest with its own kernel; vCPU and memory per VM                  | `/dev/kvm` on a Linux host; a guest kernel, image and agent for context and stop; TAP networking; a new `RUNNER_URL` | [firecracker-research.md](Firecracker.md) |

## What Could Not Be Established

- A set of container flags under which srt works for a non-root caller
  with Docker's default seccomp and AppArmor profiles. No source
  documents one, and the project's own test turns both profiles off.
- How much time srt adds to each spawn, on any platform.
- Whether `sh -c` stays the parent of `bwrap` under the runner's
  `/bin/sh`. That decides which process execa signals.
- Whether the MQTT and TCP clients that DT scripts use support SOCKS5
  or HTTP `CONNECT`.
- Whether and when #769, #648, #772 and #450 will be merged.

## Decisions

Settled by the owner on 2026-10-27, round 1:

| #   | Decision                                                                                                                                        |
| :-- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | The threat is callers abusing a permitted script through its input (stdin, parameters, choice of script); mistakes by the DT author come second |
| Q2  | The container, or the user's account, is the boundary between users; the runner adds nothing there                                              |
| Q3  | Scripts must reach devices over any protocol and address, and the runner on loopback, without a proxy                                           |
| Q4  | Windows parity is not required: a Linux-only sandbox is acceptable if the runner still runs on Windows without it                               |
| Q5  | A stop keeps the SIGTERM grace period of D18                                                                                                    |
| Q6  | The runner reports resource use; limits belong to the deployment                                                                                |
| Q8  | srt is never a regular dependency; at most an optional feature that the operator enables in `runner.yaml`, off by default                       |

## Open Decisions

- Q7, asked again with the section Container Profiles, in Detail:
  whether the container may be loosened for an inner sandbox.
- What the network setting offers, given the section Network
  Configurability, in Detail.
- What the filesystem policy denies and allows.
- How a stop and the measurements of 17a and 17b work under the
  sandbox.
- What happens when the sandbox is enabled but srt cannot start.
- How srt is installed and loaded.

## Outcome

Settled by the owner on 2026-10-27, after reading this note and
[firecracker-research.md](Firecracker.md). The design is
written up in
[SECURITY-MODEL.md](../../../../../../../servers/execution/runner/SECURITY-MODEL.md),
and issue 18
implements it ([18-script-user.md](../../../../plans/servers/execution/runner/issues/18-script-user.md)).

- **Threat model.** Two adversaries: a caller who abuses a permitted
  script through its input, and a hostile DT author. The DT author
  controls only the scripts and the state machine file; everything else
  belongs to the account that launches the runner. This widens Q1,
  which put the DT author second.
- **Design: B3 plus C1**, in the terms of SECURITY-MODEL.md. The
  orchestrator may wrap the whole runner in a microVM (B3). Inside it,
  the runner runs scripts as a second account, started through
  `setpriv` (C1), as an opt-in of `runner.yaml`.
- **srt (A1) is not pursued.** On Linux a SIGTERM to the sandbox
  becomes a SIGKILL of its tree, which defeats D18 (Process Management
  and the Stop Path); with network isolation on it blocks loopback and
  private addresses, and the mode with it off is undocumented (Network
  Configurability, in Detail); inside the runner's container it needs
  a seccomp profile looser than Docker's default (Container Profiles,
  in Detail); and it is a `0.0.x` research preview released about once
  a week (Maturity).

The open decisions above, answered:

- **Q7, loosening the container**: the container is not loosened, as
  nothing is hosted inside it.
- **The network setting**: there is none; the runner adds no proxy, and
  the deployment's network and firewall limit what scripts reach.
- **The filesystem policy**: issue 18's checks of the ownership of the
  runner's files against the script account, not a sandbox policy.
- **Stop and measurements**: unchanged; D18's SIGTERM grace and the
  measurements of 17a and 17b work as today, with `CAP_KILL` for the
  stop.
- **srt enabled but unable to start**: moot.
- **Install and load**: srt is not installed.
