"""Tests for the contrast report of dark_variant.py."""

import pathlib
import tempfile
import unittest

from dark_variant import write_dark

PAGE = '''<mxfile><diagram name="docs/x.png"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="mid" value="Label" style="rounded=0;fillColor=#808080;" vertex="1" parent="1"/>
<mxCell id="box" value="Label" style="rounded=0;fillColor=#dae8fc;strokeColor=#1e2129;" vertex="1" parent="1"/>
<mxCell id="dim" style="endArrow=none;strokeColor=#3a3f4b;" edge="1" parent="1"/>
</root></mxGraphModel></diagram></mxfile>'''


class LowContrastTest(unittest.TestCase):
    """Cells that stay hard to read in the dark variant are reported."""

    def failures(self):
        """The contrast failures write_dark reports for PAGE."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            return write_dark(source, pathlib.Path(scratch) / 'out.drawio')

    def test_text_on_a_mid_tone_fill_is_reported(self):
        """Text on a mid tone fill is reported."""
        cells = {cell for _, cell, problem in self.failures() if problem.startswith('text')}
        self.assertEqual(cells, {'mid'})

    def test_a_readable_box_is_not_reported(self):
        """A readable box is not reported."""
        self.assertNotIn('box', {cell for _, cell, _ in self.failures()})

    def test_a_dark_line_is_lightened_and_not_reported(self):
        """A dark line is lightened and not reported."""
        self.assertNotIn('dim', {cell for _, cell, _ in self.failures()})

    def test_failures_name_their_page(self):
        """Failures name their page."""
        self.assertTrue(all(page == 'docs/x.png' for page, _, _ in self.failures()))


if __name__ == '__main__':
    unittest.main()
