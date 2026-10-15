"""Tests for the shared drawio helpers and the command line of diagrams.py."""

import contextlib
import io
import os
import pathlib
import shutil
import tempfile
import unittest
import unittest.mock

import diagrams
from drawio import clean_label, drawio_path, dump_style, kind, parse_style


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


if __name__ == '__main__':
    unittest.main()
