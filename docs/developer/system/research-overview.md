# DTaaS Research Overview :books:

DTaaS is not only a software platform; it is also the implementation backbone
of a research program on composable digital twins, reusable assets, and
operations-oriented lifecycle management. The publications and workshop papers
in the repository show a coherent progression from conceptual framing to
platform architecture, and then toward domain demonstrations and advanced
methods such as runtime verification and federated collaboration.

A key starting point appears in the broader “realising digital twins” line of
work. This stream distinguishes frameworks from platforms and argues that
practical adoption requires moving from low-level reusable code assets to
service-level APIs that domain engineers can use. In this framing, digital
twins are composed from reusable assets including data, models, tools, and
services, each configured to create a concrete instance linked to a physical
twin. The emphasis is not only on modeling fidelity, but on operability: how
to instantiate, execute, monitor, and retire twins in real environments. This
perspective heavily influences DTaaS architecture decisions, especially the use
of microservices, gateway mediation, and configurable execution targets.

The composable DTaaS paper trajectory then strengthens this concept with a
clearer lifecycle and reusable-asset ontology. A recurring contribution is the
explicit treatment of lifecycle phases beyond “run once” execution. The
platform is described as supporting authoring, consolidation/discovery,
configuration, execution, exploration, save/re-spawn, scenario analysis, and
collaboration. This matters because many industrial DT deployments are
long-lived and evolve continuously. A platform that only supports deployment
and execution misses the operational workflows that consume most engineering
effort over time.

Another important theme is heterogeneity. The research repeatedly emphasizes
that useful DTs involve mixed modeling styles (physics-based, data-driven,
co-simulation), multiple data channels, and varied execution environments.
DTaaS therefore avoids forcing a single modeling formalism. Instead, it
focuses on integration contracts and orchestration patterns that let multiple
assets coexist. This choice aligns with the practical observation that
organizations already have fragmented toolchains and cannot afford complete
rewrites.

The architecture-oriented papers map requirements to a service decomposition.
Gateway and authentication components provide controlled access, while
specialized services support reusable asset management, data and visualization
paths, and execution management. Dedicated user workspaces are highlighted as
an engineering enabler: users can build and adapt twins with familiar tools
while still operating inside a shared platform model. This workspace-centered
approach reduces onboarding cost and supports collaborative reuse of assets.

A second major research axis in DTaaS is DevOps-enabled operation. The ASQAP
and related materials describe extending DTaaS with GitLab-based workflows so
that DT lifecycle actions can be automated and parameterized. In this setup,
repositories become structured carriers of DT definitions and pipeline logic.
The UI can trigger and monitor operations without exposing raw CI internals to
users. This gives two benefits: operational repeatability and lower barrier
for non-DevOps specialists. It also creates a path to scale, because execution
infrastructure can be controlled through standard CI/CD patterns and
infrastructure-as-code techniques.

The DevOps extension also introduces a federation perspective. Multiple DTaaS
instances can be linked to one or more GitLab backends, allowing controlled
collaboration across installations. In research terms, this shifts DTaaS from
a single-platform deployment model toward a networked platform model. The
interesting outcome is that collaboration becomes configurable at
infrastructure and repository boundaries, not only at application UI level.
This design supports organizational separation while preserving asset sharing
and coordinated execution.

Domain demonstration work in EVACES and its extension shows how DTaaS ideas
translate into structural health monitoring workflows. Here, the central claim
is not that DTaaS replaces specialized engineering tools, but that it
orchestrates them into reusable blocks. Functional blocks for acquisition,
modal analysis, model update, and fault handling can be assembled and
distributed. The studies stress realistic constraints: geographically separated
systems, variable latency tolerance, and differing computational needs across
workflow blocks. DTaaS is used as the integration substrate that allows these
blocks to be routed, configured, and executed consistently.

Runtime verification work adds a deeper software-engineering contribution. The
RV tutorial material analyzes multiple monitor-integration patterns: monitors
generated as internal assets, managed as per-twin internal services, or
exposed as external platform services. This classification is useful beyond RV
itself because it offers a general method for deciding where lifecycle
responsibility should live. Tighter integration is often easier to adopt
initially, while looser service-style integration improves long-term
flexibility and reuse. DTaaS benefits from this analysis by providing a place
where these choices can be made per use case rather than globally.

Across papers, one repeated strength is explicit treatment of trade-offs. High
flexibility can increase integration complexity; strict platform control can
reduce user freedom; centralized operation can simplify governance but
constrain experimentation. The DTaaS research program generally chooses
composability over monolithic standardization. That choice appears to be
validated by the diversity of case studies (incubator, firefighting, SHM,
monitor-enhanced twins) that can share a common platform backbone while
retaining domain-specific behavior.

There is also a clear commercialization and sustainability thread.
Requirements around accounting, policy enforcement, reusable services, and
role-based access control indicate a platform intended for real organizational
use, not only lab prototypes. Even where components are marked as evolving,
the architecture anticipates concerns such as multi-user tenancy, secure
route-level access, and service interoperability.

From a developer perspective, the research corpus offers practical guidance:

- Treat DTs as compositions of reusable assets rather than single projects.
- Design lifecycle-aware tooling from the start.
- Keep execution and collaboration programmable through standard DevOps interfaces.
- Isolate identity, gateway, and policy concerns as first-class platform services.
- Use workspace patterns to bridge domain experts and software platform operations.

The overall contribution of DTaaS research can be summarized as a transition
framework: it helps teams move from isolated DT prototypes to reusable,
operable, and collaborative digital twin systems. Instead of prescribing one
modeling technology, it prescribes integration and lifecycle discipline. This
makes the platform relevant across sectors where digital twins must evolve
continuously, interact with heterogeneous tools, and be maintained by
multi-disciplinary teams.

## Sources in Repository

- `.research-papers/latex/Realising2024`
- `.research-papers/latex/ComposableDTsonDTaaS`
- `.research-papers/latex/ASQAP25-workshop`
- `.research-papers/latex/EVACES2025`
- `.research-papers/latex/EVACES2025-extension`
- `.research-papers/latex/RVTutorial2024`
