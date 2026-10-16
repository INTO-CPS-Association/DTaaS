"""Tests for design.py, its layout check, and the theme colours in config.py."""

import base64
import colorsys
import pathlib
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET

import config
import design

from design import (
    label_ground, light_svg, restyle_page, retheme, sentence_case, title_case, touches,
    write_dark,
)
from diagrams import Page, parse_style


EXTRA_CSS = config.REPO / 'docs/assets/css/extra.css'
LANDING_CSS = config.REPO / 'docs/assets/css/landing.css'


def hsl_to_hex(hue, saturation, lightness):
    """The #rrggbb colour of an hsl() value given in degrees and percent."""
    red, green, blue = colorsys.hls_to_rgb(hue / 360, lightness / 100, saturation / 100)
    return '#' + ''.join(f'{round(channel * 255):02x}' for channel in (red, green, blue))


def greys():
    """The grey scale of tokens.ts, as hex by step."""
    found = re.findall(r"(\d+): 'hsl\((\d+), (\d+)%, (\d+)%\)'", config.TOKENS.read_text())
    return {int(step): hsl_to_hex(*map(int, hsl)) for step, *hsl in found}


def css_variables(css):
    """The #rrggbb custom properties of a block of CSS, by name."""
    return {name: value.lower() for name, value in
            re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})', css)}


def landing_schemes():
    """The light and the dark variables of the landing page stylesheet."""
    css = LANDING_CSS.read_text()
    dark_start = css.index('@media (prefers-color-scheme: dark)')
    return css_variables(css[:dark_start]), css_variables(css[dark_start:])


class ThemeColoursTest(unittest.TestCase):
    """Each repeated colour equals the one it was taken from."""

    def test_site_stylesheet_uses_the_brand_colours(self):
        """Site stylesheet uses the brand colours."""
        site = css_variables(EXTRA_CSS.read_text())
        for variable, token in (('dtaas-primary', 'primary'),
                                ('dtaas-primary-dark', 'primaryDark'),
                                ('dtaas-accent', 'accent'),
                                ('dtaas-mark-accent', 'markAccent')):
            with self.subTest(variable=variable):
                self.assertEqual(site[variable], config.token(token))

    def test_landing_page_uses_the_brand_and_grey_colours(self):
        """Landing page uses the brand and grey colours."""
        light, _ = landing_schemes()
        expected = {'primary': config.token('primary'),
                    'primary-dark': config.token('primaryDark'),
                    'primary-tint': config.token('primaryTint'),
                    'page': greys()[50],
                    'border': greys()[200],
                    'muted': greys()[600]}
        for variable, colour in expected.items():
            with self.subTest(variable=variable):
                self.assertEqual(light[variable], colour)

    def test_diagram_greys_are_the_token_greys(self):
        """Diagram greys are the token greys."""
        for step in (50, 100, 400, 600, 700):
            with self.subTest(step=step):
                self.assertEqual(getattr(config, f'GREY_{step}'), greys()[step])

    def test_site_hue_is_the_grey_hue(self):
        """Site hue is the grey hue."""
        hue = re.search(r'--md-hue:\s*(\d+)', EXTRA_CSS.read_text()).group(1)
        self.assertIn(f"hsl({hue}, ", config.TOKENS.read_text())

    def test_dark_ground_is_the_slate_page_of_the_site(self):
        # Material draws the slate page as hsl(var(--md-hue), 15%, 14%).
        """Dark ground is the slate page of the site."""
        hue = int(re.search(r'--md-hue:\s*(\d+)', EXTRA_CSS.read_text()).group(1))
        self.assertEqual(config.SLATE, hsl_to_hex(hue, 15, 14))

    def test_dark_lines_and_text_are_the_landing_dark_colours(self):
        """Dark lines and text are the landing dark colours."""
        _, dark = landing_schemes()
        self.assertEqual(config.LIGHT_TEXT, dark['text'])
        self.assertEqual(config.LIGHT_LINE, dark['muted'])
        self.assertEqual(config.LIGHT_BLUE_LINE, dark['link'])


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


class TitleCaseTest(unittest.TestCase):
    """Labels read as titles, and code keeps its own case."""

    def test_words_take_capitals_and_joining_words_do_not(self):
        """Words take capitals and joining words do not."""
        self.assertEqual(title_case('outputs of function blocks'), 'Outputs of Function Blocks')

    def test_a_joining_word_that_opens_a_line_keeps_its_case(self):
        """A joining word that opens a line keeps its case, the rest is capitalised."""
        self.assertEqual(title_case('<div>Cloud Services</div><div>On premise</div>'),
                         '<div>Cloud Services</div><div>On Premise</div>')

    def test_code_names_and_acronyms_keep_their_case(self):
        """Code, names and acronyms keep their case."""
        for label in ('https://intocps.org/gitlab', '/user1', 'GET access_token', 'OAuth2 PKCE',
                      'User A', 'DTaaS'):
            with self.subTest(label=label):
                self.assertEqual(title_case(label), label)

    def test_names_take_their_one_spelling(self):
        """Names take their one spelling."""
        self.assertEqual(title_case('Gitlab backend'), 'GitLab Backend')
        self.assertEqual(title_case('wrap DT [systemd, nodejs]'), 'Wrap DT [systemd, Node.js]')

    def test_hyphenated_words_capitalise_each_part(self):
        """Hyphenated words capitalise each part."""
        self.assertEqual(title_case('what-if analysis'), 'What-If Analysis')

    def test_a_joining_word_continuing_a_line_stays_lower_case(self):
        """A joining word continuing a line stays lower case."""
        self.assertEqual(title_case('Data<br>and<br>control'), 'Data<br>and<br>Control')
        self.assertEqual(title_case('Functions,Tools<br>and DTs'), 'Functions,Tools<br>and DTs')

    def test_the_rest_of_a_hyphenated_word_stays_as_written(self):
        """The rest of a hyphenated word stays as written."""
        self.assertEqual(title_case('Dash-<br>boards'), 'Dash-<br>boards')

    def test_running_twice_changes_nothing(self):
        """Running twice changes nothing."""
        once = title_case('compose into <b>live</b> twins')
        self.assertEqual(title_case(once), once)


GROUND_PAGE = '''<diagram name="docs/x.png"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="box" style="rounded=1;fillColor=#f4f8fd;" vertex="1" parent="1">
<mxGeometry x="0" y="0" width="400" height="200" as="geometry"/></mxCell>
<mxCell id="a" style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="10" y="10" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="b" style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="200" y="10" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="out" style="rounded=1;" vertex="1" parent="1">
<mxGeometry x="600" y="10" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="in" value="Use" style="" edge="1" parent="1" source="a" target="b">
<mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="across" value="Call" style="" edge="1" parent="1" source="a" target="out">
<mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="cloud" value="Config" style="shape=cloud;labelBackgroundColor=#ffffff;"
 vertex="1" parent="1"><mxGeometry x="100" y="100" width="80" height="50" as="geometry"/></mxCell>
<mxCell id="mask" value="Use" style="text;strokeColor=none;fillColor=#ffffff;" vertex="1"
 parent="1"><mxGeometry x="100" y="20" width="40" height="20" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>'''


def ground_of(cell, key='labelBackgroundColor'):
    """The style value label_ground gives a cell of GROUND_PAGE."""
    page = Page(ET.fromstring(GROUND_PAGE))
    style = parse_style(page.cells[cell].get('style'))
    label_ground(style, page.cells[cell], page)
    return style.get(key)


class LabelGroundTest(unittest.TestCase):
    """A label background takes the colour behind it, or goes."""

    def test_a_connector_label_inside_a_box_takes_its_fill(self):
        """A connector label inside a box takes its fill."""
        self.assertEqual(ground_of('in'), '#f4f8fd')

    def test_a_connector_label_across_boxes_takes_the_page(self):
        """A connector label across boxes takes the page."""
        self.assertEqual(ground_of('across'), 'default')

    def test_a_label_inside_its_shape_loses_its_background(self):
        """A label inside its shape loses its background."""
        self.assertIsNone(ground_of('cloud'))

    def test_a_text_mask_takes_the_fill_behind_it(self):
        """A text mask takes the fill behind it."""
        self.assertEqual(ground_of('mask', 'fillColor'), '#f4f8fd')


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
    found = design.check_page(drawio_page(cells), svg(*groups), connectors)
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


class SentenceCaseTest(unittest.TestCase):
    """Connector labels and guards capitalise their first letter only."""

    def test_only_the_first_letter_and_names_change(self):
        """Only the first letter and names change."""
        self.assertEqual(sentence_case('manage [gitlab runner]'), 'Manage [GitLab runner]')
        self.assertEqual(sentence_case('[If identity is verified]'), '[If identity is verified]')
        self.assertEqual(sentence_case('GET authcode (using OAUTH_CLIENT_ID)'),
                         'GET authcode (using OAUTH_CLIENT_ID)')

    def test_paths_and_quoted_words_keep_their_case(self):
        """Paths and quoted words keep their case."""
        self.assertEqual(title_case('copy src/ to "dist"'), 'Copy src/ to "dist"')


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
            source.write_text(WORDMARK_PAGE.replace('&lt;/b&gt;" vertex="1" parent="g1"', green))
            target = pathlib.Path(scratch) / 'out.drawio'
            self.assertEqual(retheme(source, target), [])
            text = target.read_text()
        self.assertEqual(text.count('image=data:image/svg+xml'), 2)
        self.assertNotIn('Digital Twin as a Service', text)
        self.assertNotIn('#d5e8d4', text)


if __name__ == '__main__':
    unittest.main()
