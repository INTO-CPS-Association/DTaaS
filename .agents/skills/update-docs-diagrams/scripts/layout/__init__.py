"""The layout check. Each rule is a defect a reader sees in the exported image.

- A connector runs in horizontal and vertical segments, never on a slant.
- Two connectors never meet a box at one point from different directions.
  Branches of one trunk, which leave a box together, are allowed.
- A connector never passes behind a box that is not one of its ends.
- A label fits in its box. Loose text, a label beside its shape and the label
  of a connector cross neither the border of another box nor a picture, and
  loose text sits on no line unless its background masks it.

The connectors and the place of each label are read from the SVG drawio
exports (svg.py), so a path is checked where drawio routes it. The width of a
label is estimated from the advance widths of Inter (text.py). Boxes come from
the drawio file. check.py runs the rules on one page.
"""
