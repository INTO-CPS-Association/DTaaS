"""Tests for where export_diagrams.py writes a page."""

import unittest
import unittest.mock

import export_diagrams as ed


class TargetOfTest(unittest.TestCase):
    """A page name may only place an image under docs/ or deploy/."""

    def test_docs_page_goes_under_docs(self):
        self.assertEqual(ed.target_of('admin/x/server.png'),
                         (ed.DOCS / 'admin/x/server.png').resolve())

    def test_deploy_page_goes_under_deploy(self):
        self.assertEqual(ed.target_of('deploy/dtaas/x.png'),
                         (ed.REPO / 'deploy/dtaas/x.png').resolve())

    def test_unplaced_pages_are_skipped(self):
        for name in (None, '', 'Workspace and assets', '/etc/x.png'):
            with self.subTest(name=name):
                self.assertIsNone(ed.target_of(name))

    def test_names_that_climb_out_are_refused(self):
        for name in ('../../x.png', 'deploy/../../x.png', '../x.png'):
            with self.subTest(name=name), self.assertRaises(SystemExit):
                ed.target_of(name)

    def test_dark_copy_only_for_docs(self):
        target = ed.target_of('admin/x/server.png')
        self.assertEqual(ed.dark_target(target).name, 'server-dark.png')
        self.assertIsNone(ed.dark_target(ed.target_of('deploy/dtaas/x.png')))


class CheckContrastTest(unittest.TestCase):
    """Only failures on placed pages, and not listed, stop the export."""

    def test_a_failure_on_a_placed_page_stops_the_export(self):
        with self.assertRaises(SystemExit):
            ed.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])

    def test_failures_on_unplaced_pages_are_ignored(self):
        ed.check_contrast([('Workspace and assets', '7', 'text 3.9 to 1')])

    def test_a_listed_cell_passes(self):
        listed = {('admin/x/server.png', '7'): 'a mid-tone legend swatch'}
        with unittest.mock.patch.dict(ed.CONTRAST_EXCEPTIONS, listed):
            ed.check_contrast([('admin/x/server.png', '7', 'text 3.9 to 1')])


if __name__ == '__main__':
    unittest.main()
