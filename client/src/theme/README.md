# The Design System

The system is two files. `tokens.ts` names every value the interface uses, and `appTheme.ts` turns those into the MUI theme. Nothing else in the application declares a colour, a radius or a spacing step.

## Adding a Page

```tsx
import Layout from 'page/Layout';
import PageShell from 'components/PageShell';

export default function Sensors() {
  return (
    <Layout>
      <PageShell title="Sensors" description="What this page is for, in one line.">
        {/* the page */}
      </PageShell>
    </Layout>
  );
}
```

Then one entry in `routes.tsx` and one in `page/MenuItems.tsx`. That is the whole of it: `Layout` gives the toolbar, the drawer, the footer and the scrolling column, and `PageShell` gives the surface, the title and the spacing every other page has.

A page that needs a different container passes `sx` to `Layout`, which is merged over the default.

## The Rules

**Never write a colour.** `primary.main`, `text.secondary` and `divider` come from the theme through `sx`, and a file outside MUI imports from `tokens.ts`. If a value is missing, add it to `tokens.ts` instead of inlining it.

**Never set a shadow.** Surfaces are separated by a one pixel border. The single shadow this design has, `overlayShadow`, is for what genuinely floats: a dialog, a menu.

**Never restyle a component in a page.** Buttons, cards, tabs and tables already carry their appearance from `appTheme.ts`. A page that needs a button to look different usually needs a different component.

**Spacing is `sx={{ p: 2 }}`, not pixels.** The step is 8, so the numbers are multiples of it and stay consistent when the step changes.

## What Is Already Handled

- **Focus.** One visible ring for the whole application, so a keyboard user can follow. Do not remove outlines.
- **Reduced motion.** Honoured globally. A page adding an animation gets that for free.
- **Touch targets.** On a touch screen every control is at least 44 pixels on its smallest side, which is what `@media (pointer: coarse)` in the theme is for. A mouse keeps the template's own smaller size. Keep both when adding a control.
- **Headings.** `PageShell` renders the page's only `h1`. A section inside it starts at `h2`.

## Where the Values Come From

The greys, the type scale and the component customisations are the Material-UI dashboard template's, taken from its `themePrimitives.ts` and its `customizations/` files. The Aarhus University palette replaces the Material blue, and that substitution is the only one.

Changing the palette is changing `brand` in `tokens.ts`. Nothing else has to move.
