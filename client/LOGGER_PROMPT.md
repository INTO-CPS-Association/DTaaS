# Logger Implementation Prompts

## Prompt 1: Initial Logger

A process workflow is defined as a sequence of actions undertaken
by the user on an application. I want to collect typical process
workflows that users follow on the DTaaS. In the context of the
DTaaS, users visit different pages and interact with tabs and
subtabs of pages.

On the Library page, users visit different tabs (data, functions,
models, digital twins, and tools). All these tabs have two
sub-tabs, namely common and private. All these tabs and sub-tabs
invoke Jupyter notebook in an iframe.

On the Digitaltwins page, there are create, manage and execute
tabs. All these tabs invoke Jupyter Lab in an iframe.

On the workbench, there are links for workspace services, and
preview library and digital twins. The virtual desktop, vscode,
jupyter lab and Jupyter notebook have links to Jupiter notebook.
Jupiter, lab vs code and virtual desktop. The links for preview
library and preview digital twins open new browser tabs.

The digital twins preview page has tabs for create execute and
management of digital twins. The create page has editor
facilities on which user can create new files and save them as
a digital twin. The editor has saved and cancel options on the
manage digital twin page. Users can see a read me of the digital
file click on reconfigure to change all the files associated
with the digital twin, or even delete it; on the execute page
uses can execute digital twins. Each digital twin has two
buttons - start / stop and history. The history stores execution
logs to indexDB and it shows the logs of all past executions.

Similarly, the library preview page has tabs for data, functions,
models tools and digital twins. These are called reusable assets.
Each tab has cards for assets pull from linked Gitlab repository.
The users can click on details button to see a README.md
associated with that asset.

User can also click on select button on a reusable asset, so
the it can be added to the shopping cart which collects items
selected by users from different tabs. There are two buttons in
the shopping cart, one is clear and another is create. The clear
button removes all the selected elements from the cart. The click
on create button takes all the selected asset names and goes to
the digital twin create tab. The create page, shows the selected
items under assets and leaves the rest of the page for user
to edit.

All the user clicks on the website should be recorded especially
the react elements related to the text given above. These clicks
are intentional user actions that will be collected to assemble
process flows.

There are privacy requirements. The usernames should be uniquely
anonymised using a hash algorithm. A sessionid should be created
as well. Both sessionid and username hash should be included in
the logs. The logs will be stored in jsonl files. So a json
format for sending a log event is preferable.

All these recordings should be collected by a logger. These logs
should be available in two forms.

1. Streamed to the browser console that can be later downloaded
   by users.
2. Streamed to a backend route "/logger". This backend route
   will be serviced by a logger microservice. The semantics of
   streaming are fire-and-forget. Perhaps browser beacon API
   might be the right model to use here.
3. Design suitable REST API interface for this logger
   microservice and implement the client code. Document this
   API in LOGGER_API.md

Prefer to use existing npm packages. If there is a widely used,
freely available and open source logging microservice, then
select it as candidate for "/logger" microservice and write
client to send logging events to this microservice.

Make changes to code only in the "client/" directory and DO NOT
touch code in other parts of the code base. Once the code is
developed, run through the following commands to make sure
that they are all successful.

```bash
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn build:fast #build the react app without source maps
yarn config:dev
yarn config:test
```

There might be changes made to "client/config" files. These are
to be used for local development. Do not make changes to these
files and do not commit changes made these files.

Make a plan and save it in client/PLAN.md. Next step is to write
the tests, code and then do a critical review of the changes
made. Once everything is satisfactory, push the code to remote
named "origin", open a pull request in the same github repo and
check the github actions related to client
(.github/workflows/client.yml). Make sure that it is successful.
Document all the changes in a markdown file inside "client/"
directory.

---

## Prompt 2: IndexedDB Logger

Read through the client/PLAN.md and the improvements made in the
last commit. Further improve the logger using the following ideas.

Currently logger outputs are being sent to console.log of the
browser tab. When user clicks on a link on the workbench page, a
new tab opens and the logging disappears on the new tab. Even if
logger works on the new tabs, the console.log is distributed over
multiple tabs with no possible synchronization. I think an
IndexDB based solution might be a better choice for storing all
the logs. Any logs from all the tabs of the application are
recorded in the same IndexDB. The user can see raw the logs by
visiting the "/insights/log" route. Also think about potential
other designs to solve this problem. Suggest two other designs
and compare them with the IndexDB-based design suggested here.
Document your suggestions in client/PLAN.md

Also check your implementation for the POST messages "logger"
backend. These messages are not being sent currently, but they
should be sent.

Make changes to code only in the "client/" directory and DO NOT
touch code in other parts of the code base. Once the code is
developed, run through the following commands to make sure
that they are all successful.

```bash
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn build:fast #build the react app without source maps
yarn config:dev
yarn config:test
```

Update the "client/config" files to comply with the latest
format.

Make a plan and save it in client/PLAN.md. Next step is to write
the tests, code and then do a critical review of the changes
made. Once everything is satisfactory, push the code to remote
named "origin", open a pull request in the same github repo and
check the github actions related to client
(.github/workflows/client.yml). Make sure that it is successful.
Document all the changes in a markdown file inside "client/"
directory.

---

## Prompt 3: PR Review Fixes

The following problems have been observed.

1. The user actions on preview/library and preview/digitaltwins
   pages are not being logged
2. Take each js file in client/config, form REACT_APP_LOGGER_URL
   by appending "/logger" to REACT_APP_URL. Take the
   REACT_APP_LOGGER_URL of config/dev.js as an example.
3. Rename REACT_APP_LOGGER_URL to LOGGER_URL.
4. Please see the PR page:
   [PR #30](https://github.com/prasadtalasila/DTaaS-Public/pull/30).
   There are copilot comments and qlty issues. Make sure that
   you address them.

Make changes to code only in the "client/" directory and DO NOT
touch code in other parts of the code base. Once the code is
developed, run through the following commands to make sure
that they are all successful.

```bash
yarn install    #install the nodejs dependencies
yarn format     #format .ts[x] and .js[x] files with prettier.
yarn syntax     #perform linting and static analysis
yarn build:fast #build the react app without source maps
yarn config:dev
yarn config:test
```

Update the "client/config" files to comply with the latest
changes.

Update client/PLAN.md. Next step is to write the tests, code
and then do a critical review of the changes made. Once
everything is satisfactory, push the code to remote named
"origin", open a pull request in the same github repo and check
the github actions related to client
(.github/workflows/client.yml). Make sure that it is successful.
Document all the changes in a markdown file inside "client/"
directory.

Iterate through the changes until the github actions pass,
existing and new copilot review comments are resolved and qlty
issues are resolved.

Also The indexDB for this application is not visible in the web
developer tools -> storage -> localhost:4000. Where is it stored?
