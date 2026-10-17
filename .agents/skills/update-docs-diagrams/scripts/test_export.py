"""Tests for the command in diagrams.py and the export in export.py."""

import contextlib
import io
import os
import pathlib
import tempfile
import unittest
import unittest.mock

import config
import diagrams
import export

from drawio.files import dark_target, target_of
from export import check_contrast, find_drawio, located_drawio


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
        self.assertEqual(target_of('admin/x/server.png'),
                         (config.DOCS / 'admin/x/server.png').resolve())

    def test_deploy_page_goes_under_deploy(self):
        """Deploy page goes under deploy."""
        self.assertEqual(target_of('deploy/dtaas/x.png'),
                         (config.REPO / 'deploy/dtaas/x.png').resolve())

    def test_unplaced_pages_are_skipped(self):
        """Unplaced pages are skipped."""
        for name in (None, '', 'Workspace and assets', '/etc/x.png'):
            with self.subTest(name=name):
                self.assertIsNone(target_of(name))

    def test_names_that_climb_out_are_refused(self):
        """Names that climb out are refused."""
        for name in ('../../x.png', 'deploy/../../x.png', '../x.png'):
            with self.subTest(name=name), self.assertRaises(SystemExit):
                target_of(name)

    def test_light_only_pages_get_no_dark_copy(self):
        """Light only pages get no dark copy."""
        name = 'developer/system/current-status-developer.png'
        self.assertIsNone(dark_target(target_of(name)))

    def test_dark_copy_only_for_docs(self):
        """Dark copy only for docs."""
        target = target_of('admin/x/server.png')
        self.assertEqual(dark_target(target).name, 'server-dark.png')
        self.assertIsNone(dark_target(target_of('deploy/dtaas/x.png')))


class CheckContrastTest(unittest.TestCase):
    """Only failures on placed pages, and not listed, stop the export."""

    def test_a_failure_on_a_placed_page_stops_the_export(self):
        """A failure on a placed page stops the export."""
        with self.assertRaises(SystemExit):
            check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_light_only_pages_are_ignored(self):
        """Failures on light only pages are ignored."""
        check_contrast(
            [('developer/system/current-status-developer.png', '7', 'text 3.9 to 1')])

    def test_failures_on_deploy_pages_are_ignored(self):
        """Failures on deploy pages are ignored, as they have no dark image."""
        check_contrast([('deploy/dtaas/docker/server/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_unplaced_pages_are_ignored(self):
        """Failures on unplaced pages are ignored."""
        check_contrast([('Workspace and assets', '7', 'text 3.9 to 1')])

    def test_a_listed_cell_passes(self):
        """A listed cell passes."""
        listed = {('admin/x/server.png', '7'): 'a mid-tone legend swatch'}
        with unittest.mock.patch.dict(config.CONTRAST_EXCEPTIONS, listed):
            check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])


class LocatedDrawioTest(unittest.TestCase):
    """A missing drawio stops with a message, even beside a drawio/ folder."""

    def test_a_folder_named_drawio_is_not_the_program(self):
        """A folder named drawio, such as the package here, is not the program."""
        with tempfile.TemporaryDirectory() as scratch:
            (pathlib.Path(scratch) / 'drawio').mkdir()
            here = os.getcwd()
            os.chdir(scratch)
            try:
                with unittest.mock.patch.dict(os.environ, {'DRAWIO': 'drawio'}), \
                        self.assertRaises(SystemExit) as stop:
                    located_drawio()
            finally:
                os.chdir(here)
        self.assertIn('drawio not found at drawio, set DRAWIO', str(stop.exception))


class FindDrawioTest(unittest.TestCase):
    """The binary comes from DRAWIO, the PATH or the installer's place."""

    def test_the_variable_wins(self):
        """The variable wins."""
        with unittest.mock.patch.dict(export.os.environ, {'DRAWIO': '/x/drawio'}):
            self.assertEqual(find_drawio(), '/x/drawio')

    def test_the_path_comes_next(self):
        """The path comes next."""
        with unittest.mock.patch.dict(export.os.environ, {}, clear=True), \
                unittest.mock.patch.object(export.shutil, 'which',
                                           return_value='/usr/bin/drawio'):
            self.assertEqual(find_drawio(), '/usr/bin/drawio')

    def test_windows_uses_the_installer_place(self):
        """Windows uses the installer place."""
        with unittest.mock.patch.dict(export.os.environ, {}, clear=True), \
                unittest.mock.patch.object(export.shutil, 'which', return_value=None), \
                unittest.mock.patch.object(export.platform, 'system', return_value='Windows'):
            self.assertEqual(find_drawio(), r'C:\Program Files\draw.io\draw.io.exe')


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
