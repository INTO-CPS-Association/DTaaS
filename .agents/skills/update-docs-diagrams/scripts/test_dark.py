"""Tests for the dark variant in design/dark.py."""

import base64
import pathlib
import tempfile
import unittest

import config

from design.dark import light_svg, write_dark


PAGE = '''<mxfile><diagram name="docs/x.png"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="mid" value="Label" style="rounded=0;fillColor=#808080;" vertex="1" parent="1"/>
<mxCell id="box" value="Label"
 style="rounded=0;fillColor=#dae8fc;strokeColor=#1e2129;" vertex="1" parent="1"/>
<mxCell id="dim" style="endArrow=none;strokeColor=#3a3f4b;" edge="1" parent="1"/>
<mxCell id="pkce" value="OAuth2"
 style="edgeLabel;labelBackgroundColor=default;" vertex="1" parent="1"/>
<mxCell id="note" value="PKCE" style="text;html=1;fillColor=default;" vertex="1" parent="1"/>
<mxCell id="dark" value="Bus"
 style="text;fillColor=#002546;fontColor=#ffffff;" vertex="1" parent="1"/>
<mxCell id="bar" style="rounded=0;fillColor=#333b4c;strokeColor=none;" vertex="1" parent="1"/>
<mxCell id="tag" value="Digital Twin"
 style="rounded=0;fillColor=#003d73;strokeColor=none;fontColor=#ffffff;" vertex="1" parent="1"/>
<mxCell id="pale" style="rounded=1;strokeColor=none;" vertex="1" parent="1"/>
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

    def test_a_default_label_background_turns_dark(self):
        """A default label background turns dark."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            write_dark(source, target)
            self.assertIn('labelBackgroundColor=#1e2229', target.read_text(encoding='utf-8'))

    def test_a_default_text_fill_turns_dark(self):
        """A default text fill turns dark."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            write_dark(source, target)
            lines = target.read_text(encoding='utf-8').splitlines()
            note = [line for line in lines if 'id="note"' in line][0]
            self.assertNotIn('fillColor=default', note)
            self.assertIn(f'fillColor={config.SLATE}', note)

    def test_a_dark_bar_with_no_border_turns_light(self):
        """A dark bar with no border turns light, like a line."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            write_dark(source, target)
            written = target.read_text(encoding='utf-8')
        cell = written[written.index('id="bar"'):].split('/>')[0]
        self.assertIn(f'fillColor={config.LIGHT_LINE}', cell)

    def test_a_dark_single_colour_svg_turns_light(self):
        """An SVG icon drawn only in navy is redrawn in the light line colour."""
        icon = base64.b64encode(b'<svg><path fill="#002060" d="M0 0"/></svg>').decode('ascii')
        logo = base64.b64encode(b'<svg><path fill="#002060"/><path fill="#fc6d26"/></svg>')
        logo = logo.decode('ascii')
        relit = base64.b64decode(light_svg(f'image=data:image/svg+xml,{icon};').split(',')[1]
                                 .rstrip(';'))
        self.assertIn(config.LIGHT_BLUE_LINE.encode(), relit)
        kept = f'image=data:image/svg+xml,{logo};'
        self.assertEqual(light_svg(kept), kept)
        brand = base64.b64encode(b'<svg><path fill="#326ce5"/></svg>').decode('ascii')
        kept = f'image=data:image/svg+xml,{brand};'
        self.assertEqual(light_svg(kept), kept)

    def test_the_label_of_a_lit_bar_stays_readable(self):
        """White text on a dark bar with no border turns dark with its bar."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            failures = write_dark(source, target)
            written = target.read_text(encoding='utf-8')
        cell = written[written.index('id="tag"'):].split('/>')[0]
        self.assertIn(f'fontColor={config.DARK_TEXT}', cell)
        self.assertFalse([f for f in failures if f[1] == 'tag'])

    def test_a_light_box_with_no_border_turns_dark(self):
        """A white box with no border takes a dark fill, like other boxes."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            write_dark(source, target)
            written = target.read_text(encoding='utf-8')
        cell = written[written.index('id="pale"'):].split('/>')[0]
        self.assertNotIn('fillColor=#ffffff', cell)
        self.assertIn('fillColor=', cell)

    def test_white_text_on_a_dark_text_mask_stays_visible(self):
        """White text on a dark text mask stays visible."""
        with tempfile.TemporaryDirectory() as scratch:
            source = pathlib.Path(scratch) / 'in.drawio'
            source.write_text(PAGE, encoding='utf-8')
            target = pathlib.Path(scratch) / 'out.drawio'
            write_dark(source, target)
            written = target.read_text(encoding='utf-8')
        dark = written[written.index('id="dark"'):].split('/>')[0]
        self.assertIn(f'fontColor={config.LIGHT_TEXT}', dark)

    def test_failures_name_their_page(self):
        """Failures name their page."""
        self.assertTrue(all(page == 'docs/x.png' for page, _, _ in self.failures()))


if __name__ == '__main__':
    unittest.main()
