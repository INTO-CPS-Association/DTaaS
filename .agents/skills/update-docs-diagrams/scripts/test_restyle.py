"""Tests for the retheme, restyle and shrink steps of design/."""

import base64
import importlib.util
import io
import pathlib
import tempfile
import unittest
import xml.etree.ElementTree as ET

import config

from design.restyle import restyle_page
from design.retheme import retheme
from design.shrink import shrink
from drawio.style import parse_style


RESTYLE_PAGE = """<diagram name="docs/r.png"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="frame" value="" style="rounded=1;fillColor=#002546;" vertex="1" parent="1">
<mxGeometry x="0" y="0" width="700" height="300" as="geometry"/></mxCell>
<mxCell id="mask" value="Label" style="text;strokeColor=none;fillColor=#ffffff;" vertex="1"
 parent="1"><mxGeometry x="100" y="100" width="80" height="30" as="geometry"/></mxCell>
<mxCell id="a" value="Client" style="rounded=1;fillColor=#ffffff;" vertex="1" parent="1">
<mxGeometry x="20" y="200" width="80" height="40" as="geometry"/></mxCell>
<mxCell id="b" value="Server" style="rounded=1;fillColor=#ffffff;" vertex="1" parent="1">
<mxGeometry x="500" y="200" width="80" height="40" as="geometry"/></mxCell>
<mxCell id="e" value="may have" style="endArrow=oval;fontFamily=Helvetica;fontColor=#000000;"
 edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>"""


def restyled(times):
    """The RESTYLE_PAGE page after the restyle ran the given number of times."""
    diagram = ET.fromstring(RESTYLE_PAGE)
    for _ in range(times):
        restyle_page(diagram)
    return diagram


def cell_style(diagram, cell):
    """The parsed style of a cell of a page."""
    return parse_style(next(c for c in diagram.iter('mxCell') if c.get('id') == cell).get('style'))


class RestyleTest(unittest.TestCase):
    """The restyle reaches a fixed point and chooses text against its ground."""

    def test_a_second_run_changes_nothing(self):
        """A second run changes nothing."""
        self.assertEqual(ET.tostring(restyled(1)), ET.tostring(restyled(2)))

    def test_text_on_a_mask_over_a_dark_box_is_light(self):
        """Text on a mask over a dark box is light."""
        style = cell_style(restyled(1), 'mask')
        self.assertEqual(style['fillColor'], '#002546')
        self.assertEqual(style['fontColor'], config.WHITE)

    def test_a_connector_label_takes_the_font_and_reads_as_a_sentence(self):
        """A connector label takes the font and reads as a sentence."""
        diagram = restyled(1)
        style = cell_style(diagram, 'e')
        self.assertEqual(style['fontFamily'], 'Inter')
        self.assertEqual(style['endArrow'], 'oval')
        connector = next(c for c in diagram.iter('mxCell') if c.get('id') == 'e')
        self.assertEqual(connector.get('value'), 'May have')

    def test_only_a_marked_page_draws_its_largest_box_as_the_boundary(self):
        """Only a marked page draws its largest box as the boundary."""
        marked = cell_style(restyled(1), 'frame')['strokeWidth']
        diagram = ET.fromstring(RESTYLE_PAGE)
        name = next(iter(config.NO_MARK))
        diagram.set('name', name)
        restyle_page(diagram)
        self.assertNotEqual(cell_style(diagram, 'frame')['strokeWidth'], marked)
        self.assertEqual(cell_style(diagram, 'frame')['strokeWidth'],
                         cell_style(diagram, 'a')['strokeWidth'])


WORDMARK_PAGE = """<mxfile><diagram name="docs/w.png"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="g1"
 style="group;" vertex="1" parent="1">
<mxGeometry x="0" y="0" width="100" height="40" as="geometry"/></mxCell>
<mxCell id="g1a" value="&lt;span&gt;emoji&lt;/span&gt;&lt;b&gt;DTaaS&lt;/b&gt;"
 vertex="1" parent="g1">
<mxGeometry width="10" height="10" as="geometry"/></mxCell>
<mxCell id="g2"
 style="group;" vertex="1" parent="1">
<mxGeometry x="0" y="100" width="100" height="40" as="geometry"/></mxCell>
<mxCell id="g2a" value="&lt;span&gt;emoji&lt;/span&gt;&lt;b&gt;DTaaS&lt;/b&gt;"
 vertex="1" parent="g2">
<mxGeometry width="10" height="10" as="geometry"/></mxCell>
<mxCell id="t" value="&lt;b&gt;Digital Twin as a Service&lt;/b&gt;"
 vertex="1" parent="1">
<mxGeometry x="0" y="50" width="100" height="20" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>"""


class RethemeTest(unittest.TestCase):
    """The retheme maps colours and replaces every old wordmark once."""

    def test_two_wordmarks_sharing_a_title_are_both_replaced(self):
        """Two wordmarks sharing a title are both replaced."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            green = '&lt;/b&gt;" style="fillColor=#d5e8d4;" vertex="1" parent="g1"'
            page = WORDMARK_PAGE.replace('&lt;/b&gt;" vertex="1" parent="g1"', green)
            source.write_text(page, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            self.assertEqual(retheme(source, target), [])
            text = target.read_text(encoding='utf-8')
        self.assertEqual(text.count('image=data:image/svg+xml'), 2)
        self.assertNotIn('Digital Twin as a Service', text)
        self.assertNotIn('#d5e8d4', text)


@unittest.skipUnless(importlib.util.find_spec('PIL'), 'Pillow is needed for the shrink step')
class ShrinkTest(unittest.TestCase):
    """A raster logo is scaled to the pixels it is drawn at."""

    def test_a_large_png_is_scaled_down_and_a_second_run_keeps_it(self):
        """A large png is scaled down, and a second run keeps it."""
        from PIL import Image  # pylint: disable=import-outside-toplevel
        out = io.BytesIO()
        Image.new('RGB', (800, 400), 'red').save(out, 'PNG')
        data = base64.b64encode(out.getvalue()).decode('ascii')
        once = shrink(data, 'png', (80, 40))
        self.assertEqual(Image.open(io.BytesIO(base64.b64decode(once))).size, (80, 40))
        self.assertEqual(shrink(once, 'png', (80, 40)), once)


if __name__ == '__main__':
    unittest.main()
