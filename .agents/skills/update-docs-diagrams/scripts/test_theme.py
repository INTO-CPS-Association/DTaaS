"""Tests that the theme colours in config match the site and the client tokens."""

import colorsys
import re
import unittest

import config


EXTRA_CSS = config.REPO / 'docs/assets/css/extra.css'


LANDING_CSS = config.REPO / 'docs/assets/css/landing.css'


def hsl_to_hex(hue, saturation, lightness):
    """The #rrggbb colour of an hsl() value given in degrees and percent."""
    red, green, blue = colorsys.hls_to_rgb(hue / 360, lightness / 100, saturation / 100)
    return '#' + ''.join(f'{round(channel * 255):02x}' for channel in (red, green, blue))


def greys():
    """The grey scale of tokens.ts, as hex by step."""
    tokens = config.TOKENS.read_text(encoding='utf-8')
    found = re.findall(r"(\d+): 'hsl\((\d+), (\d+)%, (\d+)%\)'", tokens)
    return {int(step): hsl_to_hex(*map(int, hsl)) for step, *hsl in found}


def css_variables(css):
    """The #rrggbb custom properties of a block of CSS, by name."""
    return {name: value.lower() for name, value in
            re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})', css)}


def landing_schemes():
    """The light and the dark variables of the landing page stylesheet."""
    css = LANDING_CSS.read_text(encoding='utf-8')
    dark_start = css.index('@media (prefers-color-scheme: dark)')
    return css_variables(css[:dark_start]), css_variables(css[dark_start:])


class ThemeColoursTest(unittest.TestCase):
    """Each repeated colour equals the one it was taken from."""

    def test_site_stylesheet_uses_the_brand_colours(self):
        """Site stylesheet uses the brand colours."""
        site = css_variables(EXTRA_CSS.read_text(encoding='utf-8'))
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
        hue = re.search(r'--md-hue:\s*(\d+)', EXTRA_CSS.read_text(encoding='utf-8')).group(1)
        self.assertIn(f"hsl({hue}, ", config.TOKENS.read_text(encoding='utf-8'))

    def test_dark_ground_is_the_slate_page_of_the_site(self):
        # Material draws the slate page as hsl(var(--md-hue), 15%, 14%).
        """Dark ground is the slate page of the site."""
        hue = int(re.search(r'--md-hue:\s*(\d+)', EXTRA_CSS.read_text(encoding='utf-8')).group(1))
        self.assertEqual(config.SLATE, hsl_to_hex(hue, 15, 14))

    def test_dark_lines_and_text_are_the_landing_dark_colours(self):
        """Dark lines and text are the landing dark colours."""
        _, dark = landing_schemes()
        self.assertEqual(config.LIGHT_TEXT, dark['text'])
        self.assertEqual(config.LIGHT_LINE, dark['muted'])
        self.assertEqual(config.LIGHT_BLUE_LINE, dark['link'])


if __name__ == '__main__':
    unittest.main()
