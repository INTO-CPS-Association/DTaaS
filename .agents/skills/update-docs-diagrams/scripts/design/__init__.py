"""How the diagrams look: theme colours, design rules, wording and dark variant.

The steps, in the order a new diagram goes through them:

- retheme.py maps the drawio default colours to the theme and puts the logo in
  place of the old wordmark.
- restyle.py applies the design rules of the documentation to every cell,
  with the wording of wording.py and the label backgrounds of masks.py.
- shrink.py scales the embedded raster logos down.
- dark.py makes the dark variant for the slate scheme of the site.

colour.py holds the colour arithmetic all of them use.
"""
