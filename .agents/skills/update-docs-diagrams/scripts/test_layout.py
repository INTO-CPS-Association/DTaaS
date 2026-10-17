"""Tests for the layout check in layout/."""

import unittest
import xml.etree.ElementTree as ET

from layout.check import check_page
from layout.geometry import touches


SVG_HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">')


def drawio_page(cells):
    """A drawio page named like a placed image, holding the given cells."""
    return ET.fromstring(
        '<diagram name="docs/x.png"><mxGraphModel><root>'
        '<mxCell id="0"/><mxCell id="1" parent="0"/>' + cells
        + '</root></mxGraphModel></diagram>')


def box(cell, geometry, value='', style='rounded=1;'):
    """A vertex cell with its geometry, given as (x, y, width, height)."""
    x, y, width, height = geometry
    return (f'<mxCell id="{cell}" value="{value}" style="{style}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{width}" height="{height}" as="geometry"/>'
            '</mxCell>')


def edge(cell, source, target):
    """An edge cell between two cells."""
    return (f'<mxCell id="{cell}" style="" edge="1" parent="1" source="{source}" '
            f'target="{target}"><mxGeometry relative="1" as="geometry"/></mxCell>')


def svg(*groups):
    """An SVG export whose first group places box a at the page origin."""
    first = '<g data-cell-id="a"><rect x="0" y="0" width="100" height="50"/></g>'
    return SVG_HEAD + first + ''.join(groups) + '</svg>'


def line(cell, d):
    """The SVG group drawio writes for a connector."""
    return f'<g data-cell-id="{cell}"><path d="{d}" fill="none"/></g>'


def svg_label(cell, x, y, width=1):
    """The SVG group drawio writes for an HTML label centred on a point."""
    style = ('display: flex; align-items: unsafe center; justify-content: unsafe '
             f'center; width: {width}px; height: 1px; padding-top: {y}px; '
             f'margin-left: {x}px;')
    return (f'<g data-cell-id="{cell}"><foreignObject>'
            f'<xhtml:div style="{style}"><xhtml:div>x</xhtml:div></xhtml:div>'
            '</foreignObject></g>')


BOXES = (box('a', (0, 0, 100, 50)) + box('b', (300, 0, 100, 50))
         + box('c', (150, 100, 100, 50)))


def problems(cells, *groups, connectors=True):
    """The problems check_page reports, without the page name."""
    found = check_page(drawio_page(cells), svg(*groups), connectors)
    return [(cell, problem) for _, cell, problem in found]


class ConnectorTest(unittest.TestCase):
    """Slants, lines behind boxes and shared attach points are reported."""

    def test_a_straight_line_passes(self):
        """A straight line passes."""
        found = problems(BOXES + edge('e', 'a', 'b'), line('e', 'M 100 25 L 300 25'))
        self.assertEqual(found, [])

    def test_a_slant_is_reported(self):
        """A slant is reported."""
        found = problems(BOXES + edge('e', 'a', 'c'), line('e', 'M 100 50 L 150 100'))
        self.assertIn(('e', 'connector on a slant'), found)

    def test_a_rounded_corner_is_not_a_slant(self):
        """A rounded corner is not a slant."""
        d = 'M 100 25 L 196 25 Q 200 25 200 29 L 200 100'
        self.assertEqual(problems(BOXES + edge('e', 'a', 'c'), line('e', d)), [])

    def test_a_line_behind_another_box_is_reported(self):
        """A line behind another box is reported."""
        detour = line('e', 'M 50 50 L 50 125 L 350 125 L 350 50')
        found = problems(BOXES + edge('e', 'a', 'b'), detour)
        self.assertIn(('e', 'connector passes behind c'), found)

    def test_free_form_pages_skip_the_connector_rules(self):
        """Free form pages skip the connector rules."""
        cells = BOXES + edge('e', 'a', 'c')
        slant = line('e', 'M 100 50 L 150 100')
        self.assertEqual(problems(cells, slant, connectors=False), [])

    def test_two_ends_at_one_point_from_two_sides_are_reported(self):
        """Two ends at one point from two sides are reported."""
        cells = BOXES + edge('e', 'a', 'b') + edge('f', 'a', 'c')
        found = problems(cells, line('e', 'M 100 25 L 300 25'),
                         line('f', 'M 100 25 L 100 125 L 150 125'))
        self.assertIn(('e', 'meets a at the point f uses'), found)

    def test_branches_of_one_trunk_pass(self):
        """Branches of one trunk pass."""
        cells = BOXES + edge('e', 'a', 'b') + edge('f', 'a', 'c')
        trunk = 'M 100 25 L 120 25 '
        found = problems(cells, line('e', trunk + 'L 300 25'),
                         line('f', trunk + 'L 120 125 L 150 125'))
        self.assertEqual(found, [])


class LabelTest(unittest.TestCase):
    """Labels that overflow, touch a border or sit on a line are reported."""

    def test_a_label_that_fits_passes(self):
        """A label that fits passes."""
        cells = BOXES + box('t', (0, 200, 100, 50), value='Client')
        self.assertEqual(problems(cells, svg_label('t', 0, 225, width=98)), [])

    def test_a_label_wider_than_its_box_is_reported(self):
        """A label wider than its box is reported."""
        cells = BOXES + box('t', (0, 200, 100, 50), value='Authorisation Server',
                            style='fontSize=20;')
        found = problems(cells, svg_label('t', 0, 225, width=98))
        self.assertIn(('t', 'label overflows its box'), found)

    def test_text_across_a_border_is_reported(self):
        """Text across a border is reported."""
        cells = BOXES + box('t', (260, 10, 80, 30), value='Gateway', style='text;')
        found = problems(cells, svg_label('t', 300, 25))
        self.assertIn(('t', 'text crosses the border of b'), found)

    def test_text_on_a_line_is_reported_and_a_masked_label_passes(self):
        """Text on a line is reported, and a masked label passes."""
        lines = BOXES + edge('e', 'a', 'b')
        bare = lines + box('t', (160, 15, 80, 20), value='HTTP', style='text;')
        masked = lines + box('t', (160, 15, 80, 20), value='HTTP',
                             style='text;labelBackgroundColor=default;')
        path = line('e', 'M 100 25 L 300 25')
        found = problems(bare, path, svg_label('t', 200, 25))
        self.assertIn(('t', 'text sits on connector e'), found)
        self.assertEqual(problems(masked, path, svg_label('t', 200, 25)), [])

    def test_text_over_a_picture_is_reported_and_text_beside_it_passes(self):
        """Text over a picture is reported, and text beside it passes."""
        logo = box('p', (150, 0, 100, 50), style='shape=image;image=x.svg;')
        over = BOXES + logo + box('t', (170, 10, 60, 30), value='Gateway', style='text;')
        beside = BOXES + logo + box('t', (150, 60, 100, 30), value='Gateway', style='text;')
        self.assertIn(('t', 'text covers the image p'), problems(over, svg_label('t', 200, 25)))
        self.assertEqual(problems(beside, svg_label('t', 200, 75)), [])

    def test_a_line_beside_a_box_passes(self):
        """A line beside a box passes."""
        around = line('e', 'M 50 50 L 50 175 L 350 175 L 350 50')
        self.assertEqual(problems(BOXES + edge('e', 'a', 'b'), around), [])

    def test_a_turned_label_is_left_out(self):
        """A turned label is left out."""
        cells = BOXES + box('t', (260, 10, 80, 30), value='Gateway',
                            style='text;rotation=-30;')
        self.assertEqual(problems(cells, svg_label('t', 300, 25)), [])


class TouchesTest(unittest.TestCase):
    """A block reaching a border by a unit counts, one held inside does not."""

    def test_reaching_and_held(self):
        """Reaching and held."""
        self.assertTrue(touches((0, 0, 11, 10), (10, -20, 50, 30)))
        self.assertFalse(touches((12, 0, 20, 10), (10, -20, 50, 30)))


if __name__ == '__main__':
    unittest.main()
