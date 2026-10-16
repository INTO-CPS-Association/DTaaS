"""Tests for diagrams.py: styles, labels, paths, the command and the export."""

import base64
import contextlib
import importlib.util
import io
import os
import pathlib
import shutil
import tempfile
import unittest
import unittest.mock
import xml.etree.ElementTree as ET

import config
import diagrams

from diagrams import clean_label, drawio_path, dump_style, kind, parse_style


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


class CommandTest(unittest.TestCase):
    """diagrams.py runs the step it is given and refuses an unknown one."""

    def run_main(self, *args):
        """Run diagrams.main with the given arguments and return its output."""
        out = io.StringIO()
        with unittest.mock.patch('sys.argv', ['diagrams.py', *args]), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            diagrams.main()
        return out.getvalue()

    def test_an_unknown_step_is_refused(self):
        """An unknown step is refused."""
        with self.assertRaises(SystemExit):
            self.run_main('paint', 'a.drawio', 'b.drawio')

    def test_export_runs_the_export(self):
        """Export runs the export."""
        with unittest.mock.patch.object(diagrams, 'export_all') as export_all:
            self.run_main('export')
        export_all.assert_called_once_with()

    def test_a_file_step_gets_both_paths(self):
        """A file step gets both paths."""
        step = unittest.mock.Mock()
        with unittest.mock.patch.dict(diagrams.FILE_STEPS, restyle=step):
            self.run_main('restyle', 'in.drawio', 'out.drawio')
        here = pathlib.Path.cwd().resolve()
        step.assert_called_once_with(here / 'in.drawio', here / 'out.drawio')


class TargetOfTest(unittest.TestCase):
    """A page name may only place an image under docs/ or deploy/."""

    def test_docs_page_goes_under_docs(self):
        """Docs page goes under docs."""
        self.assertEqual(diagrams.target_of('admin/x/server.png'),
                         (config.DOCS / 'admin/x/server.png').resolve())

    def test_deploy_page_goes_under_deploy(self):
        """Deploy page goes under deploy."""
        self.assertEqual(diagrams.target_of('deploy/dtaas/x.png'),
                         (config.REPO / 'deploy/dtaas/x.png').resolve())

    def test_unplaced_pages_are_skipped(self):
        """Unplaced pages are skipped."""
        for name in (None, '', 'Workspace and assets', '/etc/x.png'):
            with self.subTest(name=name):
                self.assertIsNone(diagrams.target_of(name))

    def test_names_that_climb_out_are_refused(self):
        """Names that climb out are refused."""
        for name in ('../../x.png', 'deploy/../../x.png', '../x.png'):
            with self.subTest(name=name), self.assertRaises(SystemExit):
                diagrams.target_of(name)

    def test_light_only_pages_get_no_dark_copy(self):
        """Light only pages get no dark copy."""
        name = 'developer/system/current-status-developer.png'
        self.assertIsNone(diagrams.dark_target(diagrams.target_of(name)))

    def test_dark_copy_only_for_docs(self):
        """Dark copy only for docs."""
        target = diagrams.target_of('admin/x/server.png')
        self.assertEqual(diagrams.dark_target(target).name, 'server-dark.png')
        self.assertIsNone(diagrams.dark_target(diagrams.target_of('deploy/dtaas/x.png')))


class CheckContrastTest(unittest.TestCase):
    """Only failures on placed pages, and not listed, stop the export."""

    def test_a_failure_on_a_placed_page_stops_the_export(self):
        """A failure on a placed page stops the export."""
        with self.assertRaises(SystemExit):
            diagrams.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_light_only_pages_are_ignored(self):
        """Failures on light only pages are ignored."""
        diagrams.check_contrast(
            [('developer/system/current-status-developer.png', '7', 'text 3.9 to 1')])

    def test_failures_on_deploy_pages_are_ignored(self):
        """Failures on deploy pages are ignored, as they have no dark image."""
        diagrams.check_contrast([('deploy/dtaas/docker/server/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_unplaced_pages_are_ignored(self):
        """Failures on unplaced pages are ignored."""
        diagrams.check_contrast([('Workspace and assets', '7', 'text 3.9 to 1')])

    def test_a_listed_cell_passes(self):
        """A listed cell passes."""
        listed = {('admin/x/server.png', '7'): 'a mid-tone legend swatch'}
        with unittest.mock.patch.dict(config.CONTRAST_EXCEPTIONS, listed):
            diagrams.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])


class FindDrawioTest(unittest.TestCase):
    """The binary comes from DRAWIO, the PATH or the installer's place."""

    def test_the_variable_wins(self):
        """The variable wins."""
        with unittest.mock.patch.dict(diagrams.os.environ, {'DRAWIO': '/x/drawio'}):
            self.assertEqual(diagrams.find_drawio(), '/x/drawio')

    def test_the_path_comes_next(self):
        """The path comes next."""
        with unittest.mock.patch.dict(diagrams.os.environ, {}, clear=True), \
                unittest.mock.patch.object(diagrams.shutil, 'which',
                                           return_value='/usr/bin/drawio'):
            self.assertEqual(diagrams.find_drawio(), '/usr/bin/drawio')

    def test_windows_uses_the_installer_place(self):
        """Windows uses the installer place."""
        with unittest.mock.patch.dict(diagrams.os.environ, {}, clear=True), \
                unittest.mock.patch.object(diagrams.shutil, 'which', return_value=None), \
                unittest.mock.patch.object(diagrams.platform, 'system', return_value='Windows'):
            self.assertEqual(diagrams.find_drawio(), r'C:\Program Files\draw.io\draw.io.exe')


def same_bytes(copy, source):
    """Whether a copy holds the bytes of its source.

    An LFS file is compared as its pointer when LFS is not fetched, and the
    pointer names the content hash, so equal pointers mean equal images.
    """
    return copy.read_bytes() == source.read_bytes()


class CopiesTest(unittest.TestCase):
    """Every copy of a logo or diagram equals the file it is copied from."""

    def test_package_diagrams_match_the_documentation(self):
        """Package diagrams match the documentation."""
        for source, copies in config.DEPLOY_COPIES.items():
            for copy in copies:
                with self.subTest(copy=copy):
                    self.assertTrue(same_bytes(config.REPO / copy, config.DOCS / source))

    def test_logos_beside_install_pages_match_the_brand_folder(self):
        """Logos beside install pages match the brand folder."""
        for folder in config.LOGO_PAGES:
            for logo in config.LOGOS:
                with self.subTest(folder=folder, logo=logo):
                    self.assertTrue(same_bytes(config.DOCS / folder / logo,
                                               config.DOCS / 'assets/brand/png' / logo))

    def test_package_logos_match_the_brand_folder(self):
        """Package logos match the brand folder."""
        brand = config.DOCS / 'assets/brand'
        copies = [copy for copy in (config.REPO / 'deploy').rglob('*.svg')
                  if (brand / copy.name).is_file()]
        self.assertTrue(copies)
        for copy in copies:
            with self.subTest(copy=str(copy.relative_to(config.REPO))):
                self.assertTrue(same_bytes(copy, brand / copy.name))


if __name__ == '__main__':
    unittest.main()


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
            source.write_text(SPLIT_PAGE)
            names = diagrams.split_file(source, target)
            pages = list(ET.parse(target).getroot().iter('diagram'))
            written = target.read_text()
        self.assertEqual(len(names), 2)
        self.assertIn('pages="2"', written)
        self.assertTrue(written.endswith('\n'))
        ids = [{c.get('id') for c in p.iter('mxCell')} for p in pages]
        self.assertIn({'0', '1', 'a', 'b', 'ab'}, ids)
        self.assertIn({'0', '1', 'c'}, ids)


@unittest.skipUnless(importlib.util.find_spec('PIL'), 'Pillow is needed for the shrink step')
class ShrinkTest(unittest.TestCase):
    """A raster logo is scaled to the pixels it is drawn at."""

    def test_a_large_png_is_scaled_down_and_a_second_run_keeps_it(self):
        """A large png is scaled down, and a second run keeps it."""
        from PIL import Image  # pylint: disable=import-outside-toplevel
        import design  # pylint: disable=import-outside-toplevel
        out = io.BytesIO()
        Image.new('RGB', (800, 400), 'red').save(out, 'PNG')
        data = base64.b64encode(out.getvalue()).decode('ascii')
        once = design.shrink(data, 'png', (80, 40))
        self.assertEqual(Image.open(io.BytesIO(base64.b64decode(once))).size, (80, 40))
        self.assertEqual(design.shrink(once, 'png', (80, 40)), once)
