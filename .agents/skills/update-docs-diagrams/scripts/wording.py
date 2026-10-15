"""The wording rules for labels: Title Case and one spelling per name.

Every label is a title, so each word starts with a capital letter except the
short joining words inside it. A word that already carries a capital after
its first letter, such as DTaaS or OAuth2, keeps its own case, and so does
anything that is code and not prose: a URL, a path, a name with an
underscore or a port. A name that has a fixed spelling is written that way
on every page.
"""

import re

# Short joining words, lower case unless a label starts with one.
MINOR = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'into', 'of', 'on', 'or',
         'per', 'the', 'to', 'via', 'with'}

# Names written one way on every page, by their lower case form. systemd is
# written in lower case by its project.
SPELLING = {'gitlab': 'GitLab', 'webapp': 'WebApp', 'nodejs': 'Node.js', 'systemd': 'systemd'}

LINE_BREAK = re.compile(r'<br|</?div|</?p[\s>]|\n', re.I)

# A word with any of these is code, a URL or a path, and keeps its case.
CODE = re.compile(r'[/:_@=.]\w|^\.')


def title_word(word, first, line_start=False):
    """One word of a label in Title Case.

    A joining word that opens a line after the first keeps the case it was
    written in: "and DTs" continues the line above it, while "On premise"
    starts a description.
    """
    lead, core, tail = re.match(r'^([(\[]*)(.*?)([)\]\.,;:!?]*)$', word).groups()
    if core.lower() in SPELLING:
        return lead + SPELLING[core.lower()] + tail
    if not core or CODE.search(core) or any(c.isupper() for c in core[1:]) or core.isupper():
        return word
    if core.lower() in MINOR and line_start:
        return word
    if core.lower() in MINOR and not first and not lead:
        return lead + core.lower() + tail
    parts = [part[:1].upper() + part[1:] for part in core.split('-')]
    return lead + '-'.join(parts) + tail


def title_case(label):
    """A label, plain or HTML, with its words in Title Case.

    Only the text between tags changes. Each line is a title of its own, as
    a C4 box stacks a name, a type and a description, so the first word of
    every line is capitalised, except a joining word continuing the line
    above and the rest of a word broken with a hyphen.
    """
    first, line_start, broken, text = True, False, False, ''
    pieces = re.split(r'(<[^>]*>|&\w+;|&#\d+;|\n)', label or '')
    for index, piece in enumerate(pieces):
        if LINE_BREAK.match(piece) and text.strip():
            broken = text.rstrip().endswith('-')
            first = line_start = not broken
        if not piece or piece.startswith(('<', '&', '\n')):
            continue
        words = re.split(r'(\s+)', piece)
        for at, word in enumerate(words):
            if word.strip():
                # The rest of a word broken with a hyphen stays as written.
                words[at] = word if broken else title_word(word, first, line_start)
                first = line_start = broken = False
        pieces[index] = ''.join(words)
        text += pieces[index]
    return ''.join(pieces)
