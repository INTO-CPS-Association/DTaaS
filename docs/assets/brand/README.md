# DTaaS Brand Assets

The product mark, the two lockups, and the colours, in the formats a person
actually asks for. Everything here is generated from one description of the
geometry, so a change to the mark cannot leave one variant behind.

## What the Mark Is

One figure, built on one side and drawn on the other. A twin is one thing in
two states, so the mark is one body and not two.

The drawn half is a continuous outline and not a dashed one. A dash breaks
into specks at the sixteen pixels a browser tab gives it, which was checked by
rendering and not assumed.

The primary form carries its own field. That is how the university uses colour:
`au.dk` puts the AU logo white on a solid blue header, its cards are solid blue
with white text, and a secondary colour appears as a whole block. Nowhere does
it put a secondary colour as a hairline on white, which is also where that
colour fails the three to one contrast floor. A mark with its own ground works
on a light page and a dark one, which is why there is no separate light form.

## Which File to Use

| You want | Use |
| --- | --- |
| To place it in a diagram or a slide | `dtaas-brand.drawio`, one page per variant |
| Anything on the web, at any size | the `.svg` files |
| A fixed size, or a tool that cannot read SVG | `png/`, seven sizes for the mark and four heights for each lockup |
| A favicon | `dtaas-mark.svg`, which is what both mkdocs configs use. `client/public/favicon.svg` is the application's own copy of the same geometry |

## The Variants

Three forms, each in three colourways.

| Form | File | When |
| --- | --- | --- |
| Mark alone | `dtaas-mark*.svg` | A tab, an avatar, anywhere under about 48 px where a wordmark would be unreadable |
| Mark with `DTaaS` | `dtaas-logo*.svg` | A toolbar, a README header, a slide footer |
| Mark with `Digital Twin as a Service` | `dtaas-logo-full*.svg` | A title slide, a poster, the first time a reader meets the product |

| Colourway | Suffix | What it is | On |
| --- | --- | --- | --- |
| Primary | none | The figure on its own navy field, white with a cyan drawn half | Anything. It brings its own ground |
| White | `-white` | The figure alone, white with a cyan drawn half, no field | A photograph or a coloured block that is already the ground |
| Mono | `-mono` | The figure alone, one colour, no field | One colour printing, a fax, an engraving |

The field is `#002546`, the navy the university's own site uses for a solid
block. It appears ninety times in `cdn.au.dk/2016/assets/css/app.css`, as text
and as background, where AU blue appears thirteen. The drawn half is `#37a0cb`,
the cyan of the secondary palette, which is read on that navy and never on
white.

## The Colours

These are the values in `client/src/theme/tokens.ts`, and that file is the
source of truth. They are repeated here so a designer opening this folder does
not have to read TypeScript.

| Name | Value | What it is |
| --- | --- | --- |
| Primary | `#003d73` | AU blue, Pantone 287, RGB 0 61 115, as the university publishes it |
| Primary dark | `#002546` | The navy the university's own site uses for a solid field, and the mark's ground |
| Mark accent | `#37a0cb` | The cyan of the secondary palette, on the mark's drawn half |
| Primary tint | `#eaf1fb` | Behind a selected row or a quiet panel |
| Accent | `#00aba4` | The turquoise of the secondary palette |

The palette is also the last page of the drawio file, as swatches.

## Rebuilding

The SVG files are the source. The PNG files and the drawio file are built from
them, so edit the generator and never the output.

The two Python files are one-shot generators. They resolve their output from
their own location, so they can be run from anywhere, and they read the colours
from `client/src/theme/tokens.ts` instead of repeating them, so there is one
place to change a colour and not two. They are not part of the application and
are not covered by its checks.

`render_png.py` takes the Chrome or Chromium binary from `CHROME` and falls
back to the usual paths on macOS and on Linux, so it runs in CI as well as
here. It prints which binary it used.

Run all three, in this order, from anywhere. Each resolves its paths from its
own location.

```sh
python3 docs/assets/brand/build_brand.py    # the SVG variants
python3 docs/assets/brand/build_drawio.py   # the drawio file
python3 docs/assets/brand/render_png.py
```

The PNG files are rasterised with headless Chrome, which resolves the same
font stack a browser would, so the wordmark matches what the site shows. A
browser that cannot resolve the image writes a blank file and exits zero, so
the script checks the size of every file it writes and stops on the first
empty one.

## Where It Is Already Used

Changing the mark changes these, so check them after a rebuild.

| Where | File |
| --- | --- |
| The documentation site header | `mkdocs.yml`, `mkdocs-github.yml`, `logo:` |
| The documentation site tab | the same files, `favicon:` |
| The PDF export cover | `mkdocs.yml`, `cover_logo:` |
| The redirect page | `docs/redirect-page.html` |
| The application toolbar | `client/src/components/BrandMark.tsx`, which carries the geometry inline |
| The application tab | `client/public/favicon.svg` |

The last two are separate copies of the same geometry, on purpose: a component
takes its colour from the theme and a browser tab has no theme to take it from.

## Which File Is Portable, And Which Is Not

This is the one caveat in the kit, and it decides which file to hand somebody.

| File | Portable? |
| --- | --- |
| `dtaas-mark*.svg` | Yes, with no conditions. It carries no text |
| `png/*` | Yes, with no conditions. The text is already pixels |
| `dtaas-logo*.svg` and `dtaas-logo-full*.svg` | Only where Inter is installed |

The lockup SVG files carry their wordmark as a `<text>` element and not as
outlines, and their `viewBox` is computed from Inter's metrics. On a machine
without Inter the wordmark falls back to another face and no longer fits that
box. Converting the text to outlines needs a font tool this project does not
carry, and the fonts on this machine are licensed to the university and not to
the association.

So: a web page that loads Inter, or this application, can use the lockup SVG.
Anything else, a slide, a poster, a document, a partner's site, takes the PNG.
If a resolution-independent lockup is needed outside those contexts, that is a
font-tooling task and it is not done here.

## If the Drawio File Opens Empty

The page content has to be an `<mxGraphModel>` element inside each
`<diagram>`, and not a string assigned to its text. Written as text, every
angle bracket is escaped and draw.io opens a file it can parse and a drawing it
cannot find. After any change to the generator, open the result and look at it.
