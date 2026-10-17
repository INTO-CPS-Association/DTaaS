"""Tests for the wording rules and the label backgrounds of design/."""

import unittest
import xml.etree.ElementTree as ET

from design.masks import label_ground
from design.wording import sentence_case, title_case
from drawio.files import Page
from drawio.style import parse_style


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


if __name__ == '__main__':
    unittest.main()
