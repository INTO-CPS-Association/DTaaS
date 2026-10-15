"""Points, boxes and straight segments in drawio page coordinates.

A box is (left, top, right, bottom). The layout rules compare boxes and
segments with a small slack, so a line drawn along a border, or a label that
touches one, is not reported.
"""

import math

# How far, in drawio units, a point may stray before a rule reports it.
SLACK = 2


def far(first, second, distance):
    """Whether two points are further apart than a distance."""
    return math.dist(first, second) > distance


def inside(point, box, margin=0):
    """Whether a point lies within a box grown by a margin."""
    x, y = point
    return box[0] - margin <= x <= box[2] + margin and box[1] - margin <= y <= box[3] + margin


def overlap(first, second):
    """Whether two boxes overlap by more than the slack on both axes."""
    width = min(first[2], second[2]) - max(first[0], second[0])
    height = min(first[3], second[3]) - max(first[1], second[1])
    return width > SLACK and height > SLACK


def touches(text, box):
    """Whether a text block reaches across the border of a box.

    A label that only touches a line is already hard to read, so this takes
    a quarter of the slack the other rules allow.
    """
    margin = SLACK / 4
    width = min(text[2], box[2]) - max(text[0], box[0])
    height = min(text[3], box[3]) - max(text[1], box[1])
    held = all(inside(corner, box, margin) for corner in (text[:2], text[2:]))
    return width > margin and height > margin and not held


def contains(outer, inner):
    """Whether one box holds another, give or take the slack."""
    return all(inside(corner, outer, SLACK) for corner in (inner[:2], inner[2:]))


def crosses(segment, box):
    """Whether a straight segment passes through the inside of a box."""
    (x1, y1), (x2, y2) = segment
    left, top, right, bottom = box[0] + SLACK, box[1] + SLACK, box[2] - SLACK, box[3] - SLACK
    if left >= right or top >= bottom:
        return False
    steps = max(2, int(math.dist((x1, y1), (x2, y2)) // 2))
    return any(left < x1 + (x2 - x1) * i / steps < right
               and top < y1 + (y2 - y1) * i / steps < bottom
               for i in range(steps + 1))


def slanted(segment):
    """Whether a straight segment is neither horizontal nor vertical."""
    (x1, y1), (x2, y2) = segment
    return abs(x1 - x2) > SLACK and abs(y1 - y2) > SLACK


def heading(start, end):
    """The direction from one point to the next, as a sign on each axis."""
    def sign(value):
        return 0 if abs(value) <= SLACK else (1 if value > 0 else -1)
    return sign(end[0] - start[0]), sign(end[1] - start[1])
