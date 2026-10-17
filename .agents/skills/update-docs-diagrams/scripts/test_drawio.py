"""Tests for reading, writing and splitting drawio files in drawio/."""

import os
import pathlib
import shutil
import tempfile
import unittest
import unittest.mock
import xml.etree.ElementTree as ET

from drawio.files import drawio_path
from drawio.split import split_file
from drawio.style import clean_label, dump_style, kind, parse_style


class StyleTest(unittest.TestCase):
    """A style string survives a round trip, bare words included."""

    def test_round_trip_keeps_bare_words_and_keys(self):
        """Round trip keeps bare words and keys."""
        style = 'image;image=img/docker.svg;fillColor=#ffffff;'
        self.assertEqual(dump_style(parse_style(style)), style)

    def test_kind_names_what_a_cell_draws(self):
        """Kind names what a cell draws."""
        cases = {'text;html=1;': 'text', 'group;': 'group',
                 'shape=image;': 'image', 'ellipse;': 'stencil',
                 'rounded=1;': 'box'}
        for style, expected in cases.items():
            with self.subTest(style=style):
                cell = unittest.mock.Mock(get=lambda key: None)
                self.assertEqual(kind(parse_style(style), cell), expected)


class LabelTest(unittest.TestCase):
    """A label loses its inline fonts and colours, and keeps its size."""

    def test_italics_and_colours_go_and_small_sizes_grow(self):
        """Italics and colours go and small sizes grow."""
        label = ('<i>Web</i> '
                 '<font color="#ff0000" style="font-size: 10px; color: red">app</font><br>')
        self.assertEqual(clean_label(label, 14),
                         'Web <font style="font-size: 14px;">app</font>')


class DrawioPathTest(unittest.TestCase):
    """A command line file must be a .drawio file under the current directory."""

    def setUp(self):
        self.scratch = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.scratch)
        self.addCleanup(os.chdir, os.getcwd())
        os.chdir(self.scratch)

    def test_a_drawio_file_here_is_accepted(self):
        """A drawio file here is accepted."""
        self.assertEqual(drawio_path('a.drawio'),
                         pathlib.Path(self.scratch).resolve() / 'a.drawio')

    def test_other_files_and_other_folders_are_refused(self):
        """Other files and other folders are refused."""
        for name in ('a.txt', '../a.drawio', '/tmp/a.drawio'):
            with self.subTest(name=name), self.assertRaises(SystemExit):
                drawio_path(name)


SPLIT_PAGE = """<mxfile><diagram name="install" id="i"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A"
 style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="0" y="0" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="b" value="B"
 style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="60" y="0" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="ab"
 style="" edge="1" parent="1" source="a" target="b">
<mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="c" value="C"
 style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="500" y="0" width="50" height="30" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>"""


class SplitTest(unittest.TestCase):
    """A page with two diagrams far apart becomes two pages."""

    def test_each_cluster_gets_its_page_with_its_edges(self):
        """Each cluster gets its page with its edges."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            target = pathlib.Path(scratch) / 'out.drawio'
            source.write_text(SPLIT_PAGE, encoding='utf-8')
            names = split_file(source, target)
            pages = list(ET.parse(target).getroot().iter('diagram'))
            written = target.read_text(encoding='utf-8')
        self.assertEqual(len(names), 2)
        self.assertIn('pages="2"', written)
        self.assertTrue(written.endswith('\n'))
        ids = [{c.get('id') for c in p.iter('mxCell')} for p in pages]
        self.assertIn({'0', '1', 'a', 'b', 'ab'}, ids)
        self.assertIn({'0', '1', 'c'}, ids)


if __name__ == '__main__':
    unittest.main()
