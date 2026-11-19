# The Bim Extension

`@into-cps-association/dtaas-ext-bim` is the `bim` extension of this client. It
takes the extension of `@into-cps-association/bim-kit/dtaas`, which brings the
Buildings page, the IFC GlobalId anchor, the IFC to GLB converter, the encoding
presets and the room and storey scopes. It adds the `aec` substrate, which draws
a building model in 3D on the Visualise tab of the Digital Twins page.

`src/aec/` is the substrate. An `ifc-guid` anchor names an object by its IFC
GlobalId and the sensor gets a marker and a label on that object. The substrate
reads the converted model (`.glb`) and the property tree (`.json`) beside it,
which the Buildings page writes to the models folder. Around the canvas sit the
options of the Buildings page, with the same keys: views, floors, transparency,
shell, classes and help. Its controls are drawn in the theme the host gives in
`ui.Theme`. A frame is drawn only when the camera or the model changes. A closed
pane gives its WebGL context back.

The substrate is building code, so it lives here and not in the client core
(requirement K5 of the domain kits plan). Its code loads only when a
visualisation draws a building. `aec` is no longer a standard substrate of the
SDK, so the presets of `bim-kit` on `aec` pass the contract only with the
substrate this package adds.

The client links this folder with `link:./extensions/bim`, as it links the
contract in `../../sdk`, and builds it from its TypeScript source. Run its tests
from `client/`:

```bash
yarn test:ext
```

The tests replace `bim-kit` with a stand-in in `tests/__mocks__/`, since the
real extension pulls in a WebAssembly geometry kernel. The tests of `bim-kit`
itself run in its own repository.

The substrate belongs in `bim-kit` once that package can take it. Until then,
this package is where the client keeps it.
