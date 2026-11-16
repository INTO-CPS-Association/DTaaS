# Research: Firecracker microVMs for the Runner's Scripts

Should the runner start the scripts it executes inside Firecracker
microVMs rather than inside Anthropic's sandbox-runtime (`srt`)? This
file is the companion of
[Sandbox](Sandbox.md), called "the
srt note" below. It takes each section of that note in turn, gives the
Firecracker answer to the same point, and says whether Firecracker is
better, worse or the same. Facts about srt and about the runner are
taken from the srt note with its citations, not derived again.

All web sources were read on 2026-10-27, against Firecracker v1.17.0.
Repository citations give `file:line` under `servers/execution/runner/`
at commit `57f88107`. Statements marked _inference_ are this document's
reasoning, not something a source says. The yardstick is the owner's
settled decisions Q1 to Q8 (srt note, Decisions).

## Sources

- **README**: the README of
  <https://github.com/firecracker-microvm/firecracker>.
- **spec**: `SPECIFICATION.md` in that repository.
- **design**: `docs/design.md`.
- **start**: `docs/getting-started.md`.
- **jailer**: `docs/jailer.md`.
- **net**: `docs/network-setup.md`.
- **vsock**: `docs/vsock.md`.
- **mmds**: `docs/mmds/mmds-user-guide.md`.
- **prod**: `docs/prod-host-setup.md`.
- **snap**: `docs/snapshotting/snapshot-support.md`.
- **actions**: `docs/api_requests/actions.md`.
- **kernel**: `docs/kernel-policy.md`.
- **policy**: `docs/RELEASE_POLICY.md`.
- **FAQ**: `FAQ.md`.
- **rel**: <https://github.com/firecracker-microvm/firecracker/releases>,
  and the GitHub API for the same repository (tags, dates, open
  counts).
- **site**: <https://firecracker-microvm.github.io/>.
- **#1721**:
  <https://github.com/firecracker-microvm/firecracker/issues/1721>.
- **fc-ctr**:
  <https://github.com/firecracker-microvm/firecracker-containerd> and
  its GitHub API entry.
- **kata-fc**:
  `docs/how-to/how-to-use-kata-containers-with-firecracker.md` of
  <https://github.com/kata-containers/kata-containers>, and
  <https://katacontainers.io/>.
- **gVisor**: <https://gvisor.dev/docs/> and
  <https://gvisor.dev/docs/architecture_guide/platforms/>.
- **WSL**: <https://learn.microsoft.com/en-us/windows/wsl/wsl-config>
  and <https://github.com/microsoft/WSL/issues/40735>.
- **EC2**:
  <https://aws.amazon.com/about-aws/whats-new/2026/02/amazon-ec2-nested-virtualization-on-virtual/>
  and
  <https://aws.amazon.com/about-aws/whats-new/2026/06/nested-virtualization-intel-us-gov-cloud/>.
- **srt note**: [sandbox-runtime-research.md](Sandbox.md),
  by section name.

## Summary

- Firecracker is a virtual machine monitor (VMM) in Rust on top of
  Linux KVM. A script would run under a guest kernel of its own, with a
  handful of virtio devices: network, block, vsock, balloon and entropy,
  plus a serial console [README; FAQ]. That is a stronger boundary than
  srt's namespaces on the host kernel (_inference_).
- It needs read and write access to `/dev/kvm` on an x86_64 or aarch64
  Linux host: bare metal, or a VM with nested virtualization, which the
  project says is outside its charter [start; #1721]. It does not run on
  Windows or macOS. Q4 accepts that, as for srt.
- It is a 1.x project under semantic versioning, with a minor release
  about every three months and six to twelve months of patches per
  minor [policy; rel]. srt has had 77 `0.0.x` releases, about one a week
  (srt note, Maturity).
- Its network is whatever the host builds around a TAP device: NAT,
  a bridge or nothing, any protocol, filtered only by host rules [net;
  design]. Devices on any protocol and address are reachable (Q3), which
  srt cannot offer with network isolation on. But the guest's loopback
  is its own, so `RUNNER_URL` at `127.0.0.1` no longer reaches the
  runner.
- Nothing of the runner's context crosses on its own. The environment,
  stdin, stdout, stderr and the exit code all need an agent inside the
  guest, over vsock; the scripts and the DT's files need a block device
  or a root filesystem image.
- No host signal reaches a guest process. D18's grace period (Q5)
  survives only through that agent; srt turns SIGTERM into SIGKILL
  (srt note, Process Management and the Stop Path).
- A VM must be given a vCPU count and a memory size, so it imposes
  limits by construction. 17a and 17b would measure the VMM, not the
  script's tree, unless the agent reports from inside.
- The documented boot takes at most 125 ms to `/sbin/init`, with a
  minimal kernel and root filesystem on bare metal, and the VMM itself
  takes at most 5 MiB [spec]. srt's cost per spawn is unmeasured.
- The operational cost is larger than srt's: a guest kernel, a root
  filesystem with every runtime the DT's scripts use, an agent, TAP and
  firewall set-up, and the jailer, which runs as root [jailer].

## What Firecracker Is

### Purpose and Threat Model

Firecracker was built at AWS for Lambda and Fargate, to run
"multi-tenant, serverless container and function services" [README];
the site cites "15 trillion+ monthly Lambda function invocations"
[site]. Its threat model treats the guest as hostile: "all vCPU threads
are considered to be running malicious code as soon as they have been
started" [design]. srt's threat is an agent steered by prompt injection,
and its docs warn that it "is not a complete isolation boundary" (srt
note, Purpose and Threat Model).

Its own limits, as stated:

- "Firecracker does not perform any network traffic filtering"; guest
  egress "should be filtered at the host-level" [design].
- "Firecracker is not able to mitigate host's hardware
  vulnerabilities"; the production guide asks to disable SMT and Kernel
  Samepage Merging where tenants must be separated [prod].
- "It is strongly recommended that each Firecracker process corresponds
  to a workload of a single tenant" [prod]. One runner serves one DT
  (srt note, The Runner's Position), which fits (_inference_).

Compared with srt: better. The guest is assumed hostile, and the
boundary is a hypervisor rather than a set of namespaces.

### Mechanisms per Platform

| Platform                                | Isolation                                                                     | Network                                                    | Other                                                                |
| :-------------------------------------- | :---------------------------------------------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------- |
| Linux x86_64 or aarch64 with `/dev/kvm` | a KVM guest with its own kernel; the VMM under seccomp, and under the jailer  | virtio-net backed by a host TAP device; host NAT or bridge | jailer: chroot, cgroups, namespaces, privilege drop [design; jailer] |
| Linux without KVM                       | none; Firecracker does not start                                              | none                                                       | [start]                                                              |
| WSL2 on Windows 11                      | as Linux, when `nestedVirtualization` exposes `/dev/kvm`; nested, unsupported | as Linux, inside the WSL VM                                | [WSL; #1721]                                                         |
| Windows, macOS                          | none                                                                          | none                                                       | "Firecracker runs on Linux hosts" [design]                           |

srt covers Linux, macOS and Windows (alpha) with three different
mechanisms (srt note, Mechanisms per Platform). Firecracker covers one
platform with one mechanism. Compared with srt: worse in reach, equal
under Q4, and simpler to reason about (_inference_).

### Interface

- **Process and API.** One `firecracker` process per VM. It serves an
  HTTP API on a Unix socket (`--api-sock`), specified in OpenAPI, or
  boots from `--config-file` without the socket [README; start]. The
  API sets the machine (vCPUs, memory), the kernel and its boot
  arguments, drives, network interfaces, vsock, MMDS and rate limiters,
  and then `InstanceStart` [actions].
- **Jailer.** `jailer` prepares a chroot, cgroups, an optional network
  and PID namespace and the device nodes, drops to a given uid and gid,
  and execs Firecracker. "We run the jailer as the `root` user"
  [jailer]. Production use should go through it [design; prod].
- **No library.** There is no npm package. The runner would speak HTTP
  over the API socket, which Node's `http` does with `socketPath`, and
  reach vsock as Unix sockets, so no npm dependency is added
  (_inference_). Higher layers exist, firecracker-containerd and Kata,
  but both bring containerd with them (see Where Firecracker Fits).

srt is a library and CLI in the runner's own language, with one
`wrapWithSandbox` call per command (srt note, Interface). Compared with
srt: worse to integrate, as the runner would write the VM lifecycle
itself; better on dependencies, as nothing enters `package.json`.

### Maturity

- v1.17.0 was published on 2026-09-10 under Apache-2.0 [rel]. Minor
  releases came on 2025-03-18 (1.11), 2025-05-07 (1.12), 2025-08-28
  (1.13), 2025-12-17 (1.14), 2026-03-09 (1.15), 2026-06-04 (1.16) and
  2026-09-10 (1.17), with patch releases between: twelve tags in the
  twelve months to 2026-10-27 [rel]. The README says releases come
  "typically every two or three months".
- "Firecracker uses semantic versioning 2.0.0 for all releases". Each
  minor release gets patches for at least six months, and the last two
  for up to a year; an API of X.Y works with every later X.V [policy].
- Changes still happen inside 1.x: 1.15.0 asks for vsock snapshots to
  be regenerated, and the patch release 1.16.2 changed the snapshot
  format [rel].
- A guest or host kernel is supported for at least two years once
  added; today 6.1 and 6.18 [kernel].
- On 2026-10-27 the repository had 133 open issues and pull requests
  together, and was last pushed on 2026-10-26 [rel].

srt calls itself a "Beta Research Preview", and 0.0.80 changed its
behaviour (srt note, Maturity). Compared with srt: clearly better.

## How It Meets the Runner's Needs

### Running Inside the Runner's Container

The runner's image is `node:26.10.0-slim` and runs as `node`, uid 1000,
under Docker's default profiles (srt note, Running Inside the Runner's
Container).

- **KVM.** "Firecracker requires read/write access to `/dev/kvm`",
  through the `kvm` group or an ACL [start]. A container gets it from a
  device mapping such as `--device /dev/kvm`, on a host that has it
  (_inference_).
- **TAP.** "The first step on the host for any microVM is to create a
  Linux `tap` device" [net], with forwarding and NAT rules. In the
  container that needs `/dev/net/tun` and `CAP_NET_ADMIN` over the
  container's own network namespace (_inference_). A persistent TAP
  that the operator creates for uid 1000 can be opened without the
  capability (_inference_ from Linux's TUN ownership; no Firecracker
  source says so).
- **Jailer.** It runs as root, enters a mount namespace, uses
  `pivot_root`, runs `mknod` for `/dev/kvm` and `/dev/net/tun`, and
  writes cgroup files [jailer]. In a container these are the calls that
  Docker's seccomp and AppArmor profiles gate behind `CAP_SYS_ADMIN`
  (srt note, What the Defaults Block That srt Needs), and the cgroup
  writes need a delegated subtree, which 17b found rarely available
  (_inference_).
- **Firecracker's own seccomp.** It loads its filters per thread before
  guest code runs [design]. No source says whether that works under
  Docker's default profile.
- No source, Firecracker's or Kata's, documents Firecracker inside a
  Docker container; both integrations run it on the host under
  containerd [kata-fc; fc-ctr].

_Inference_: without the jailer, the container needs a device mapping
and perhaps one capability scoped to its own network namespace. That is
narrower than srt's `seccomp=unconfined`, and leaves the guest kernel
and KVM as the wall. With the jailer, it needs root and the same
loosening as srt, or more. Compared with srt: better without the jailer,
the same or worse with it.

### Network: the Physical Twin and the Runner's Own API

- Each VM has its own TAP device on the host; addressing is static,
  set in the guest or through the kernel's `ip=` boot argument [net].
- With NAT, nftables "will masquerade packets from the guest IP as if
  they came from the host's IP"; with a bridge, the TAP joins `br0`,
  which "exposes your microVM to the local network" [net]. Several VMs
  need a subnet and rules each [net].
- Firecracker filters nothing [design], so a guest reaches every address
  and protocol that the host's routes and rules allow: TCP, UDP, MQTT on
  1883, CoAP, OPC UA, with no proxy to honour (_inference_). Multicast
  discovery crosses a bridge but not a NAT (_inference_).
- **The runner's API.** In the guest, `127.0.0.1` is the guest's own
  loopback (_inference_). `RUNNER_URL` is always
  `http://127.0.0.1:<port>` (`src/fsm/script-context.ts:150-158`), so it
  would have to name the host's TAP address instead. The runner listens
  on all interfaces (same lines), so it would answer there
  (_inference_). The alternative is a forwarder inside the guest from
  `127.0.0.1:<port>` to a vsock port, which the host relays to the
  runner [vsock]. The script's client then sees no proxy, but one
  exists.
- In a container, the TAP and its NAT live in the container's network
  namespace, so the guest reaches what the container reaches today,
  through Docker's NAT. A bridge onto the physical LAN is out of reach
  from Docker's default bridge network (_inference_).

srt with network isolation on gives proxied TCP to listed hosts, no UDP,
and no direct loopback or private ranges, through its fixed `NO_PROXY`
(srt note, Network: the Physical Twin and the Runner's Own API).
Compared with srt: better for devices, which Q3 wants; worse for the
runner's loopback, which Q3 also wants, as `RUNNER_URL` must change or a
relay must be added.

### Passing the Runner's Context

The runner passes its context through the environment (D23:
`RUNNER_URL`, `RUNNER_TOKEN`, `DT_ID`, `DT_STATE`, `DT_ENTRY`,
`DT_PARAM_*` and the declared `env`; `src/fsm/script-context.ts:46-51`)
and through stdin (D27). It starts `join(location, name)`
(`src/execa-manager.service.ts:116`) and reads stdout, stderr and the
exit code from execa (`src/execa-runner.ts:40-54`). None of these
crosses into a VM on its own. The channels on offer:

| Channel        | Carries                                                                                    | Limits                                                                                                        |
| :------------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| vsock          | any byte stream; the host connects with `CONNECT <port>`, the guest to `<uds_path>_<port>` | needs a listener in the guest; open connections close on a snapshot [vsock; snap]                             |
| MMDS           | JSON that the host puts before or during the run; the guest reads it over HTTP             | needs a network device; V1 is unauthenticated, V2 uses a session token [mmds]                                 |
| block device   | a host file "pre-formatted with a filesystem that the guest kernel supports"               | an image per change; no live host directory, as there is no shared-filesystem device (_inference_ from [FAQ]) |
| boot arguments | the kernel command line                                                                    | short, and readable by every process in the guest (_inference_)                                               |
| serial console | text                                                                                       | "we do not recommend that users enable the serial device in production" [prod]                                |

_Inference_: the workable design is an agent in the guest, started by
its init, that takes a run request over vsock (argv, environment,
stdin), execs the script, streams stdout and stderr back, and reports
the exit code. firecracker-containerd ships an agent of that kind for
its own protocol [fc-ctr]. The scripts directory and the DT's files go
in on a block device or in the root filesystem image.

The demo shows what a fresh VM per run breaks: its scripts keep the
ward in `run/ward.json`, next to the scripts directory
(`demo/hospital/scripts/ward.ps1:3-14`), so each run must see what the
last one wrote. Two VMs cannot safely mount one writable ext4 image at
once (_inference_). One long-lived VM per runner, whose agent runs every
script, keeps that working; a VM per spawn does not.

srt on Linux passes the environment and stdin through, and on Windows
loses both (#772, #648; srt note, Windows and the Demo). Compared with
srt: clearly worse on Linux, where srt needs nothing here and
Firecracker needs a protocol and an agent.

### Resource Limits

- The machine configuration gives each VM a vCPU count and a memory
  size; the spec measures 1 vCPU and 128 MiB [spec]. These are hard
  limits of the guest, and a VM cannot run without them (_inference_).
- The jailer can place the VMM in a cgroup with `--cgroup` values such
  as `cpuset.cpus` [jailer], so that each microVM has "its own dedicated
  quota of the CPU time" [design]. `--resource-limit` sets `fsize` and
  `no-file` [jailer].
- Rate limiters cap bandwidth and operations per second on network and
  block devices, with token buckets [design; README].
- **Measurement (17a, 17b).** The guest's vCPUs are threads of the
  `firecracker` process [design], so its CPU time includes the guest's
  (_inference_). Its peak resident memory is the VMM plus the guest
  memory touched, guest kernel and page cache included (_inference_).
  17a's direct child becomes `firecracker`, or `jailer`; with
  `--new-pid-ns` the VMM has another pid, written to a file in the jail
  [jailer]. 17b's tree walk ends at the VMM, as the script's processes
  are inside the guest. Per-script figures would have to come from the
  agent.

srt neither limits nor measures (srt note, Resource Limits), and under
it 17a measures the wrapper (srt note, Process Management and the Stop
Path). Q6 says the runner reports and the deployment limits. Compared
with srt: different rather than better. Firecracker imposes limits that
someone must choose, which would have to be the operator in
`runner.yaml` to stay within Q6, and it blurs 17a and 17b unless the
agent reports.

### Process Management and the Stop Path

- No POSIX signal crosses into a guest. A stop with a grace period needs
  a request to the agent, which sends SIGTERM to the script, and a kill
  of the VMM after `stopGrace` (_inference_). That keeps D18 (Q5), at
  the cost of the agent.
- `SendCtrlAltDel` asks the guest for an orderly shutdown; on x86_64 it
  needs `CONFIG_SERIO_I8042` and `CONFIG_KEYBOARD_ATKBD`, on aarch64 a
  GPIO power key and a userspace consumer [actions]. The grace period is
  then the guest init's, not `stopGrace` (_inference_).
- "Firecracker does not currently support guest reboot"; on x86 a
  `poweroff` leaves the process alive, while `reboot` ends it when the
  guest boots with `reboot=k` [FAQ]. A guest should end with a reboot
  (_inference_).
- No source read says how Firecracker handles SIGTERM. If it keeps the
  default action, execa's SIGTERM ends the VM at once, with no grace
  (_inference_).
- Ending the VMM ends every process in the guest, so the tree kill that
  17b set aside comes with it, as under srt (_inference_).
- After a run, the TAP device and its rules [net], the jail directory,
  the sockets and the cgroup must go (_inference_ from [jailer]). A
  SIGKILL of the runner leaves them behind unless the runner cleans up
  at its next start, as srt leaves mount points (srt note, #139).
- With one VM per runner, the agent stops scripts while the VM lives on,
  and the runner's shutdown (D14, DOCKER.md) must stop the VM too
  (_inference_).

srt on Linux turns SIGTERM into a SIGKILL of the whole sandbox and so
defeats D18 (srt note, Process Management and the Stop Path). Compared
with srt: better, as D18 can be kept, but only through new code on both
sides of the VM.

### Overhead per Spawn

- "It takes `<= 125 ms` to go from receiving the Firecracker
  InstanceStart API call to the start of the Linux guest user-space
  `/sbin/init` process", measured "using a VM with the serial console
  disabled and a minimal kernel and root file system", on m5d.metal and
  m6g.metal hosts [spec].
- The VMM reaches its API socket within 8 CPU ms; the wall clock spans
  "`6 ms to 60 ms`", typically 12 ms [spec].
- The VMM's own threads take at most 5 MiB for 1 vCPU and 128 MiB
  [spec]. The guest kernel and its userland come on top, and no source
  gives their size (_inference_).
- After init, the agent and the script's runtime start: a shell is
  cheap, while Node or Python in the guest add their own start-up
  (_inference_). Each VM also needs a writable disk of its own, a TAP
  and its rules, and a jail directory (_inference_ from [net; jailer]).
- **Snapshots** skip the boot: a state file and a memory file [snap]. A
  restore needs an "identical" software and hardware configuration;
  "Guest network connectivity is not guaranteed to be preserved after
  resume"; open vsock connections close; random state and IDs repeat in
  every clone; MMDS is not kept [snap]. `RUNNER_TOKEN` and the
  parameters would be sent after the restore (_inference_). Diff
  snapshots are a developer preview [snap].
- All these figures are for bare metal. Nested virtualization is not
  part of the project's charter [#1721].

No source measures srt's cost per spawn; it runs ripgrep over the tree,
two bwraps and two socats each time (srt note, Overhead per Spawn).
Compared with srt: documented where srt is not, but probably larger, as
a kernel boots each time (_inference_). One VM per runner pays it once.

### Windows and the Demo

- Firecracker does not run on Windows [design]. The runner keeps
  running there without it, which Q4 accepts.
- WSL2 has `nestedVirtualization`, on by default, on Windows 11 only
  [WSL]. On Windows 10 it is overridden (WSL #40735, open since
  2026-06-07). Nested use is outside Firecracker's charter, and VMs so
  nested "are _not_ to be considered isolated from each-other" [#1721].
- The demo's scripts are PowerShell (`demo/hospital/scripts/*.ps1`) and
  share a file across runs (see Passing the Runner's Context). Under
  Firecracker they need PowerShell in a Linux guest or a port to a
  shell, and a persistent disk (_inference_).

srt on Windows is alpha and loses the environment and stdin (srt note,
Windows and the Demo). Compared with srt: worse in reach, better in that
nothing half-works. The demo runs under neither.

### Operational Cost

- A guest kernel: "an uncompressed Linux kernel binary" [start], or a
  `bzImage` on x86_64 since 1.17 [rel], built with the virtio and vsock
  options [kernel] and the keyboard options for `SendCtrlAltDel`
  [actions].
- A root filesystem: "an ext4 file system image" [start] holding the
  agent, a shell, and every runtime and tool the DT's scripts call.
  Today those come from the runner's image or host; under Firecracker
  each DT may need an image of its own (_inference_).
- Updates: the guest kernel and image become the operator's to patch,
  and a Firecracker minor release loses support after six to twelve
  months [policy; kernel].
- The `firecracker` and `jailer` binaries, statically linked and of one
  version [jailer]; not on npm.
- Host preparation: `/dev/kvm` access, TAP devices or the right to make
  them, forwarding and NAT rules, and the production advice on SMT, KSM,
  swap and microcode [prod].

srt costs an npm package, bubblewrap, socat and ripgrep (srt note,
Running Inside the Runner's Container). Compared with srt: clearly
worse.

## The Runner's Position

The facts of the srt note's section The Runner's Position hold. Under
Firecracker the list in What a Script Can Reach Today changes as below
(_inference_, for a guest that holds only the scripts directory, the
DT's files and the run's context):

| Today, a subverted script can          | Under srt, filesystem isolation on    | Under Firecracker                               |
| :------------------------------------- | :------------------------------------ | :---------------------------------------------- |
| read `runner.yaml` and its MQTT secret | not if `denyRead` lists it            | no; the file is not in the guest                |
| read the private key of 15b            | not if `denyRead` lists it            | no                                              |
| write the database                     | not unless `allowWrite` lists it      | no                                              |
| rewrite the scripts directory          | not unless `allowWrite` lists it      | only the guest's copy                           |
| read the runner's `/proc` environment  | yes under `enableWeakerNestedSandbox` | no; the guest has its own kernel                |
| reach the network                      | as the network setting allows         | as the host's TAP and rules allow               |
| call the API with `RUNNER_TOKEN`       | yes                                   | yes, through a changed `RUNNER_URL` or a relay  |
| attack a kernel                        | the host's, minus srt's seccomp list  | the guest's; then KVM and the VMM under seccomp |

Compared with srt: better. The list is closed by construction rather
than by a deny list, and the `/proc` leak of the weaker mode does not
arise. With one VM per runner, a subverted script can still leave
something behind for later runs in the same guest (_inference_).

## Network Configurability, in Detail

The owner asked whether an operator could turn network isolation on or
off per runner (srt note, Network Configurability, in Detail).

- Firecracker has no network policy of its own [design]. "Off" is a VM
  without a network interface, which talks to the runner over vsock
  only. "On" is a TAP with NAT or a bridge. Anything between is host
  firewall rules on the TAP: per address, per port, per protocol
  (_inference_).
- So the operator's choice is not all or nothing, and the open mode is
  the documented one, not an undocumented code path as in srt.
- MMDS needs a network interface [mmds], so a VM without one gets its
  context over vsock or a disk.
- Every option is host configuration that the runner or the operator
  must write and remove per VM [net].

Compared with srt: better.

## Container Profiles, in Detail

The srt note's section asks what Docker's defaults block, what the
loosened profile gives an attacker, and whether there is a middle path.

### What the Defaults Block That Firecracker Needs

| Firecracker needs                             | Docker's default                                                | Source             |
| :-------------------------------------------- | :-------------------------------------------------------------- | :----------------- |
| `/dev/kvm`                                    | not mapped; `--device /dev/kvm`, on a host that has it          | start; _inference_ |
| a TAP device                                  | `/dev/net/tun` not mapped; creating a TAP needs `CAP_NET_ADMIN` | net; _inference_   |
| the jailer's namespaces, `pivot_root`, mounts | the same seccomp and AppArmor gates as for bwrap                | jailer; srt note   |
| the jailer's cgroups                          | a delegated cgroup subtree                                      | jailer; 17b        |
| the jailer itself                             | root, where the image runs as `node`                            | jailer; srt note   |

### What an Attacker in the Container Gains

- **Without the jailer.** The container gains `/dev/kvm`, and perhaps
  `CAP_NET_ADMIN` in its own network namespace. Code running as the
  runner's user can then start VMs of its own and change the
  container's network rules (_inference_). It does not gain the
  namespace and mount calls behind the CVE class that the srt note lists
  (_inference_).
- **With the jailer.** Root and the loosened seccomp and AppArmor
  profiles, so what srt's loosening gives (srt note, What an Attacker in
  the Container Gains), and root on top (_inference_).
- **From inside the guest.** The attacker meets a guest kernel, then
  KVM and the VMM's device emulation under the VMM's seccomp filters
  [design], before reaching the container at all.

### Middle Paths

| Path                                                      | Status                                                                                                                                                                         |
| :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firecracker without the jailer, in the runner's container | the narrowest container change; the project advises the jailer in production [design; prod]; no source documents Firecracker in a container                                    |
| TAP devices created in advance, owned by uid 1000         | no capability at run time (_inference_); the operator sets up the pool and its rules                                                                                           |
| A privileged launcher next to the runner                  | a VM is a separate process reached over sockets, so a launcher can host the VMs while the runner's container keeps its defaults (_inference_); unlike srt, but a new component |
| No container: the runner on the host, in group `kvm`      | works as documented on bare metal [start]; the jailer still needs root                                                                                                         |
| A cloud VM as host                                        | nested KVM on EC2 since 2026-02, on some Intel types [EC2]; outside Firecracker's charter [#1721]                                                                              |

Compared with srt: better. A narrow path exists, where srt had none
that a source showed working for a non-root caller (srt note, Middle
Paths).

## Where Firecracker Fits: gVisor and Kata

Firecracker is one of three common answers to running untrusted code in
containers. gVisor is "an application kernel" in Go that "runs in
userspace" and by default intercepts system calls with seccomp traps
(systrap), so it needs no KVM and is "a better choice when running
inside a VM" [gVisor]. Kata Containers puts each container in
"lightweight virtual machines that feel and perform like containers",
with QEMU, Cloud Hypervisor or Firecracker underneath; with Firecracker
it needs containerd and the devmapper snapshotter [kata-fc].
firecracker-containerd does the same with a guest agent and runc; it
has no releases, and its last commit was on 2026-07-16 [fc-ctr]. Kata
and gVisor isolate a whole container, so here they would mean a
container per script, which the srt note's Alternatives table already
prices as a redesign. Neither was researched further.

## Alternatives the Assessment Compares

Firecracker joins the srt note's table as one more row. Against its
neighbours (_inference_):

- **A container per script**: the same scale of redesign of context,
  network and stop, with a stronger boundary and no Docker socket, but
  a kernel and an image to maintain.
- **cgroups v2 per script** and **Windows Job Objects**: it brings
  limits with it, but measures the VM, not the script.
- **The container, hardened**: it separates the runner from its
  scripts, which hardening does not, at a far higher cost.
- **srt as an opt-in**: it meets Q3 for devices and Q5, and needs no
  looser container without the jailer; it misses Q3 for loopback as
  written, and costs more to build and run.

## srt versus Firecracker against the Decisions

| Decision                                       | srt (from the srt note)                                               | Firecracker                                                                                                                         |
| :--------------------------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Q1 threat: callers abusing a script's input    | contains the filesystem; the network only when on, which Q3 rules out | contains the filesystem, `/proc` and the kernel; the network is the host's choice. Better                                           |
| Q2 the container or account is the boundary    | needs a looser container, which weakens that boundary                 | without the jailer, a device and perhaps one capability; with it, as srt. Better or the same                                        |
| Q3 devices on any protocol; runner on loopback | fails with network isolation on; with it off, filesystem only         | devices: yes, any protocol. Loopback: no; `RUNNER_URL` must change or a relay be added. Better, but not as written                  |
| Q4 Linux-only is acceptable                    | Linux and macOS; Windows alpha, losing environment and stdin          | Linux with KVM only; the runner runs on Windows without it. Meets Q4                                                                |
| Q5 a stop keeps D18's grace period             | fails: SIGTERM becomes SIGKILL                                        | met through an agent in the guest, not through signals. Better, at a cost                                                           |
| Q6 runner reports, deployment limits           | no limits; 17a and 17b measure the wrapper                            | vCPU and memory are compulsory limits, set by the operator; 17a and 17b measure the VMM unless the agent reports. Worse for reports |
| Q8 opt-in in `runner.yaml`, off by default     | an optional npm package, plus bubblewrap, socat and ripgrep           | external binaries, a kernel and an image, no npm package; a `runner.yaml` section naming them and the VM size. Possible, heavier    |
| Q7, open: loosen the container                 | yes: seccomp, AppArmor and the weaker mode                            | without the jailer, `/dev/kvm` and a TAP; with it, yes                                                                              |
| Open: the network setting                      | all or nothing; "off" undocumented                                    | none, NAT, bridge, or firewall rules per address; host work per VM                                                                  |
| Open: the filesystem policy                    | `denyRead` and `allowWrite` over the host tree                        | what goes into the image or disk; nothing else exists. Files shared across runs need one VM per runner                              |
| Open: stop and measurements                    | a SIGKILL of the tree; measurements of the wrapper                    | SIGTERM through the agent, a VMM kill after `stopGrace`; figures from the agent, or of the VMM                                      |
| Open: enabled but cannot start                 | `initialize()` throws without its tools                               | no `/dev/kvm`, binaries, kernel or image: a check at start-up, then refuse or run unsandboxed                                       |
| Open: install and load                         | an optional npm dependency, loaded on demand                          | binaries and images installed by the operator; HTTP and vsock over Unix sockets with Node's own modules                             |

## What Could Not Be Established

- Whether Firecracker, with or without the jailer, runs inside a Docker
  container under the default seccomp and AppArmor profiles. No source
  documents it; Kata and firecracker-containerd run it on the host.
- How Firecracker reacts to SIGTERM.
- The guest memory and the time to a running script with a root
  filesystem that holds a shell and the runtimes that DT scripts use,
  and any figure under nested virtualization.
- Whether a TAP device created in advance and owned by uid 1000 is
  enough for an unprivileged Firecracker in practice.
- Whether DTs other than the demo share files between runs, which
  decides between a VM per spawn and a VM per runner.

## Open Decisions

What Firecracker would require of each, without deciding it:

- **Q7, loosening the container.** Without the jailer: `/dev/kvm` and a
  TAP, or `CAP_NET_ADMIN`. With it: root and the profiles that srt
  needs. Or a launcher outside the runner's container.
- **The network setting.** The host or the runner creates a TAP and its
  rules per VM, and the operator picks none, NAT, bridge or rules.
  `RUNNER_URL` names the host's TAP address, or a relay is added.
- **The filesystem policy.** What goes into the image or the per-run
  disk, whether the scripts directory is copied per run or per change,
  and how files that scripts write come back out.
- **Stop and measurements.** An agent protocol for SIGTERM, a VMM kill
  after `stopGrace`, and whether the agent reports resources or 17a and
  17b report the VMM.
- **Enabled but cannot start.** A start-up check of `/dev/kvm`, the
  binaries, the kernel and the image; then refuse to start, or run
  unsandboxed with a warning.
- **Install and load.** Binaries of one version, a kernel and an image,
  named in `runner.yaml`; and who builds and patches the image.
- **New: one VM per spawn or per runner.** Per spawn: the strongest
  separation of runs, a boot each time, no shared files. Per runner:
  one boot, shared files, and a script that can affect later runs.

## Assessment

Against the settled decisions, Firecracker fits better than srt, but
not well enough to adopt now. It meets the points that srt fails:
devices over any protocol (Q3), a stop with a grace period (Q5), and a
sandbox that need not loosen the container (Q2, Q7), under a boundary
designed for hostile guests and with a mature, semantically versioned
release line. It misses Q3's loopback clause as written, blurs the
reporting that Q6 leaves to the runner, and its opt-in (Q8) means a
guest kernel, a root filesystem with every runtime the DT needs, an
agent protocol for context, output and stop, and network set-up per VM:
a subsystem larger than any issue the runner has planned. srt is
cheaper to wire in but fails Q3 and Q5 outright, so it is the weaker of
the two.

If the owner wants a sandbox at all, Firecracker with one VM per runner
and without the jailer is the option to prototype, once the points
under What Could Not Be Established have answers. Otherwise neither
fits, and the srt note's "Nothing new" or "The container, hardened",
with 15a deciding who may call, remain the proportionate choices.

## Outcome

Settled by the owner on 2026-10-27, after reading this note and
[the srt note](Sandbox.md#outcome). The design is
written up in
[SECURITY-MODEL.md](../../../../../../../servers/execution/runner/SECURITY-MODEL.md),
and issue 18
implements it ([18-script-user.md](../../../../plans/servers/execution/runner/issues/18-script-user.md)).

- **Threat model.** Two adversaries: a caller who abuses a permitted
  script through its input, and a hostile DT author. The DT author
  controls only the scripts and the state machine file; everything else
  belongs to the account that launches the runner.
- **Design: B3 plus C1**, in the terms of SECURITY-MODEL.md. The
  orchestrator may wrap the whole runner in a microVM such as
  Firecracker (B3); that is deployment work, not a runner feature.
  Inside it, the runner runs scripts as a second account, started
  through `setpriv` (C1), as an opt-in of `runner.yaml`.
- **Firecracker per script (A2) or per runner (A3), as a runner
  feature, is not pursued.** The guest's loopback is its own, so
  `RUNNER_URL` at `127.0.0.1` no longer reaches the runner (Network:
  the Physical Twin and the Runner's Own API); the context, stdin, the
  output and the exit code need an agent in the guest (Passing the
  Runner's Context); 17a and 17b would measure the VMM, not the script
  (Resource Limits); a VM per run can not share the run files that the
  demo's scripts keep (Passing the Runner's Context); and either form
  is larger than any planned runner issue (Assessment).

The open decisions above lapse with A2 and A3. Those that still apply
to B3 are the orchestrator's: SECURITY-MODEL.md lists them under
Orchestrator Requirements, and a deploy issue is to carry them.
