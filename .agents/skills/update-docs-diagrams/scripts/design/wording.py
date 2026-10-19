"""The wording rules: Title Case for a box, a sentence for a connector.

Code, URLs and paths keep their case, and a few names have one spelling.
"""

import re


# Short joining words, lower case unless a label starts with one.
MINOR = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'into', 'of', 'on', 'or',
         'per', 'the', 'to', 'via', 'with'}


# Names written one way on every page, by their lower case form. systemd, the
# rabbitmq-fmpy package, the KUKA LBR iiwa robot and the robot interface
# modules of the flex-cell example are written in lower case by their projects.
SPELLING = {'gitlab': 'GitLab', 'webapp': 'WebApp', 'nodejs': 'Node.js', 'systemd': 'systemd',
            'authcode': 'authcode', 'rabbitmq-fmpy': 'rabbitmq-fmpy', 'iiwa': 'iiwa',
            'urinterface': 'urinterface', 'kukalbrinterface': 'kukalbrinterface'}


LINE_BREAK = re.compile(r'<br|</?div|</?p[\s>]|\n', re.I)


# A word with any of these is code, a URL or a path, and keeps its case.
CODE = re.compile(r'[/:_@=.]\w|^\.|/$|[\'"]')


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
    above and the rest of a word broken with a hyphen, which stays as written.
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
                words[at] = word if broken else title_word(word, first, line_start)
                first = line_start = broken = False
        pieces[index] = ''.join(words)
        text += pieces[index]
    return ''.join(pieces)


def sentence_case(label):
    """A label read as a sentence: the first letter capitalised, names spelt once.

    Connector labels are relations ("defines", "may have") and a UML guard is
    a condition, so neither is a title.
    """
    pieces = re.split(r'(<[^>]*>|&\w+;|&#\d+;)', label or '')
    first = True
    for index, piece in enumerate(pieces):
        if not piece or piece.startswith(('<', '&')):
            continue
        words = re.split(r'(\s+)', piece)
        for at, word in enumerate(words):
            core = word.strip('()[].,;:!?').lower()
            if core in SPELLING:
                words[at] = word.replace(word.strip('()[].,;:!?'), SPELLING[core])
            elif first and word.strip() and not CODE.search(word):
                lead = len(word) - len(word.lstrip('(['))
                words[at] = word[:lead] + word[lead:lead + 1].upper() + word[lead + 1:]
            first = first and not word.strip()
        pieces[index] = ''.join(words)
    return ''.join(pieces)
