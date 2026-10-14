"""Tests for where export_diagrams.py writes a page."""

import unittest
import unittest.mock

import export_diagrams as ed


class TargetOfTest(unittest.TestCase):
    """A page name may only place an image under docs/ or deploy/."""

    def test_docs_page_goes_under_docs(self):
        """Docs page goes under docs."""
        self.assertEqual(ed.target_of('admin/x/server.png'),
                         (ed.DOCS / 'admin/x/server.png').resolve())

    def test_deploy_page_goes_under_deploy(self):
        """Deploy page goes under deploy."""
        self.assertEqual(ed.target_of('deploy/dtaas/x.png'),
                         (ed.REPO / 'deploy/dtaas/x.png').resolve())

    def test_unplaced_pages_are_skipped(self):
        """Unplaced pages are skipped."""
        for name in (None, '', 'Workspace and assets', '/etc/x.png'):
            with self.subTest(name=name):
                self.assertIsNone(ed.target_of(name))

    def test_names_that_climb_out_are_refused(self):
        """Names that climb out are refused."""
        for name in ('../../x.png', 'deploy/../../x.png', '../x.png'):
            with self.subTest(name=name), self.assertRaises(SystemExit):
                ed.target_of(name)

    def test_light_only_pages_get_no_dark_copy(self):
        """Light only pages get no dark copy."""
        name = 'developer/system/current-status-developer.png'
        self.assertIn(name, ed.LIGHT_ONLY)
        self.assertIsNone(ed.dark_target(ed.target_of(name)))

    def test_dark_copy_only_for_docs(self):
        """Dark copy only for docs."""
        target = ed.target_of('admin/x/server.png')
        self.assertEqual(ed.dark_target(target).name, 'server-dark.png')
        self.assertIsNone(ed.dark_target(ed.target_of('deploy/dtaas/x.png')))


class CheckContrastTest(unittest.TestCase):
    """Only failures on placed pages, and not listed, stop the export."""

    def test_a_failure_on_a_placed_page_stops_the_export(self):
        """A failure on a placed page stops the export."""
        with self.assertRaises(SystemExit):
            ed.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_light_only_pages_are_ignored(self):
        """Failures on light only pages are ignored."""
        ed.check_contrast([('developer/system/current-status-developer.png', '7', 'text 3.9 to 1')])

    def test_failures_on_unplaced_pages_are_ignored(self):
        """Failures on unplaced pages are ignored."""
        ed.check_contrast([('Workspace and assets', '7', 'text 3.9 to 1')])

    def test_a_listed_cell_passes(self):
        """A listed cell passes."""
        listed = {('admin/x/server.png', '7'): 'a mid-tone legend swatch'}
        with unittest.mock.patch.dict(ed.CONTRAST_EXCEPTIONS, listed):
            ed.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])


class FindDrawioTest(unittest.TestCase):
    """The binary comes from DRAWIO, the PATH or the installer's place."""

    def test_the_variable_wins(self):
        """The variable wins."""
        with unittest.mock.patch.dict(ed.os.environ, {'DRAWIO': '/x/drawio'}):
            self.assertEqual(ed.find_drawio(), '/x/drawio')

    def test_the_path_comes_next(self):
        """The path comes next."""
        with unittest.mock.patch.dict(ed.os.environ, {}, clear=True), \
                unittest.mock.patch.object(ed.shutil, 'which', return_value='/usr/bin/drawio'):
            self.assertEqual(ed.find_drawio(), '/usr/bin/drawio')

    def test_windows_uses_the_installer_place(self):
        """Windows uses the installer place."""
        with unittest.mock.patch.dict(ed.os.environ, {}, clear=True), \
                unittest.mock.patch.object(ed.shutil, 'which', return_value=None), \
                unittest.mock.patch.object(ed.platform, 'system', return_value='Windows'):
            self.assertEqual(ed.find_drawio(), r'C:\Program Files\draw.io\draw.io.exe')


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
        for source, copies in ed.DEPLOY_COPIES.items():
            for copy in copies:
                with self.subTest(copy=copy):
                    self.assertTrue(same_bytes(ed.REPO / copy, ed.DOCS / source))

    def test_logos_beside_install_pages_match_the_brand_folder(self):
        """Logos beside install pages match the brand folder."""
        for folder in ed.LOGO_PAGES:
            for logo in ed.LOGOS:
                with self.subTest(folder=folder, logo=logo):
                    self.assertTrue(same_bytes(ed.DOCS / folder / logo,
                                               ed.DOCS / 'assets/brand/png' / logo))

    def test_package_logos_match_the_brand_folder(self):
        """Package logos match the brand folder."""
        brand = ed.DOCS / 'assets/brand'
        copies = [copy for copy in (ed.REPO / 'deploy').rglob('*.svg')
                  if (brand / copy.name).is_file()]
        self.assertTrue(copies)
        for copy in copies:
            with self.subTest(copy=str(copy.relative_to(ed.REPO))):
                self.assertTrue(same_bytes(copy, brand / copy.name))


if __name__ == '__main__':
    unittest.main()
