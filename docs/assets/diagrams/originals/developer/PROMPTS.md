# Prompts and Decisions

The diagrams in this directory were drawn by a coding agent (Claude Code
with the diagram-design plugin) from the prompts below. This file keeps
the prompts as they were written, the decisions taken along the way, and
one combined prompt that asks for the final result in a single request.

## User prompts

The prompts in the order they were given. Slash commands are shown with
their arguments, and answers to the agent's questions are marked as such.

| # | Prompt |
| :--- | :--- |
| 1 | Create new architecture diagrams for the complete DTaaS, and cli, client, servers/execution/runner, deploy/services components using diagram-design and save them in docs/assets/diagrams/originals/developer/ directory. |
| 2 | Answer: skin "DTaaS theme"; variants "Light + dark". |
| 3 | `/diagram-design:export-diagram` the diagrams you just created. Also create deployment diagrams for deploy/dtaas and deploy/workspace. |
| 4 | yes create separate diagrams for all six deployments |
| 5 | create onboard diagram designs for client, dtaas (code in cli) and dtaas-services (code in deploy/services/cli). Add drawio diagrams for all the diagrams you drew so far. |
| 6 | Answer: onboarding "Both"; drawio "One file per diagram, light". |
| 7 | In a subagent, draw timeline of all the features developed in this codebase. Do two versions of the diagram, (i) from the very beginning, (ii) for the last one year. |
| 8 | drawio is installed. Can you check those diagrams using xvfb? |
| 9 | export the pngs as high-quality diagrams. Check the other png diagrams in docs/ to get a sense of the expected diagram quality |
| 10 | `/diagram-design` explore lib/dt-automation package. Create a state machine and data model diagrams for it. Do it for regular devops workflows and measurement features. |
| 11 | `/diagram-design` The DTaaS works on the premise of create-use-share. Looking at the architectural diagrams you drew so far, and looking at the codebase, draw process diagrams for these three phases. These phases would be separations on the x-axis of the diagram. The Asset Author, DT Creator, Manager, and User are user categories to be shown along the y-axis. Draw two versions of the diagram: one for workspace-based workflows, and another for automation layer-based workflows. Create a README.md giving table of diagram name and what it is about. Give two sentences per diagram. Have only one entry per diagram (ex, dtaas-server-deployment is one entry). |
| 12 | Answer: Manager lane "DT manager / operator". |
| 13 | The manager can perform reconfigure operation only. |
| 14 | Also include the create-use diagrams for the private assets as well in the diagrams you just drew. |
| 15 | `/diagram-design` draw a technology stack diagram for the cli, client, deploy/services, deploy/workspace + deploy/dtaas, servers/ in a single diagram. |
| 16 | what do you mean by "redraw everything at a larger type scale"? |
| 17 | Redraw all the figures as per your suggestion |
| 18 | Save all the user prompts and decisions and a single comprehensive prompt in the figures directory in which you placed all the diagrams. |

## Decisions

### Taken by the user

| Question | Decision |
| :--- | :--- |
| Skin | DTaaS theme from `client/src/theme/tokens.ts`, not the skill's default skin. |
| Variants | A light and a dark version of every diagram, as the docs pair `#only-light` and `#only-dark` images. |
| Deployments | One diagram per deployment package: four under `deploy/dtaas/docker`, two under `deploy/workspace`. |
| Onboarding | Both kinds per component: an admin or user workflow, and a contributor path through the code. |
| drawio | One `.drawio` file per diagram, light page only. |
| Timelines | Drawn by a subagent, once from the first commit and once for the last year. |
| Manager lane | The DT manager or operator, who only reconfigures twins. Platform administration is left out. |
| Private work | Every role first creates and uses its work privately; sharing is an optional, dashed step. |
| Type scale | Redraw every diagram with the skill's presentation type sizes on narrower canvases. |
| README | One row per diagram with two sentences, light and dark counting as one diagram. |

### Taken by the agent

- **Facts from code.** Components, ports, versions and states were read
  from the code and compose files. Where the docs disagreed with the
  code, the diagrams follow the code.
- **Visual types.** Architecture, deployment, flowchart, state machine,
  ER, swimlane, layer stack and timeline, each within the skill's budget
  of 9 nodes, 12 arrows and 2 accent elements.
- **Accent use.** The accent marks one or two things per diagram worth
  noticing. Defects found in the code are drawn in rather than hidden:
  a stale poll that overwrites a cancel with a timeout, port 443
  published without a Traefik entrypoint, and the unprotected workspace
  route with Dex.
- **Colours.** Every colour is a solid hex value, because Inkscape and
  drawio draw `rgba()` fills as black.
- **Type sizes.** Names at 16 pixels and labels at 12 pixels on canvases
  about 1040 pixels wide, so text stays legible when MkDocs scales the
  image to its 760 pixel column. Longer wording was shortened to fit;
  no component, version, state or arrow was removed.
- **drawio files.** Edges are attached to their cells at both ends, so
  boxes can be moved without breaking connectors.
- **PNG export.** drawio under `xvfb-run` exports the PNG images at 1600
  pixels wide with an 8 pixel border, as the `update-docs-diagrams`
  skill does for the other docs diagrams. Dark PNGs come from dark drawio
  sources; the timelines, which have no drawio file, come from their SVGs.
- **Location.** The files sit in `originals/`, which `mkdocs.yml`
  excludes from the site build, so no page links to them yet.

## Combined prompt

A single prompt that asks for the same result in one request.

```text
Use the diagram-design skill to draw developer diagrams of the DTaaS
codebase and save them in docs/assets/diagrams/originals/developer/.

Style
- Skin the skill with the website theme in client/src/theme/tokens.ts:
  white paper, AU navy ink #002546, turquoise accent #00807a (dark mode
  #00aba4), link blue #0b5fa5, Inter for names, Geist Mono for technical
  text, Instrument Serif for titles. Use solid hex colours only.
- Ship every diagram as a light and a dark HTML file, SVG exports of
  both, and PNG images of both at 1600 pixels wide.
- Add one editable .drawio file per diagram (light page), with every
  connector attached to its boxes at both ends. Export the PNGs with
  drawio under xvfb-run (width 1600, border 8), as the
  update-docs-diagrams skill does, and match the quality of the other
  PNG diagrams in docs/.
- Use the skill's presentation type sizes (16 pixel names, 12 pixel
  labels) on canvases about 1040 pixels wide, so the text stays legible
  in the 760 pixel MkDocs column. Keep each diagram within 9 nodes,
  12 arrows and 2 accent elements; split it otherwise.
- Read facts from the code, not the docs. Use the accent for the one or
  two things worth noticing, including defects you find in the code.

Diagrams
1. Architecture: the whole platform, cli/, client/,
   servers/execution/runner and deploy/services.
2. Deployment: one diagram for each package in deploy/dtaas/docker
   (localhost, server, secure-server,
   secure-server_with_integrated-gitlab) and deploy/workspace
   (dex/localhost, keycloak/production), showing hosts, networks,
   containers, ports, routes, auth and host mounts.
3. Onboarding flowcharts, two per tool: the admin or user workflow and
   the contributor path, for the client, the dtaas CLI (cli/) and
   dtaas-services (deploy/services/cli).
4. lib/dt-automation: a state machine and a data model for the DevOps
   execution workflow, and the same pair for the measurement feature.
5. Create-use-share swimlanes with the phases Create, Use and Share on
   the x-axis and the Asset Author, DT Creator, DT Manager and User
   lanes on the y-axis. The DT Manager only reconfigures twins. Show
   each role creating and using its work privately before an optional
   share. Draw one for workspace-based workflows (workspace folders and
   the common folder) and one for the automation layer (GitLab projects
   and pipelines, and the common GitLab project).
6. One technology stack diagram with a column each for cli/, client/,
   deploy/services, deploy/workspace + deploy/dtaas and servers/, and
   layers from runtime up to delivery, naming declared versions.
7. Two feature timelines from the git history, drawn in a subagent: one
   from the first commit and one for the last year, placing features at
   their merge and release dates.

Check every render (light, dark and drawio) with the skill's
self-check and by eye, using xvfb-run for drawio. Then write README.md
in the same directory with a table of one row per diagram, light and
dark counting as one, and two sentences on what each diagram shows.
```
