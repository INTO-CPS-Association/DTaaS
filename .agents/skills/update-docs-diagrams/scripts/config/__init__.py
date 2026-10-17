"""The paths, page lists, sizes and theme colours a maintainer edits.

paths.py says where the scripts read and write, pages.py which pages a rule
treats differently and why, and theme.py the theme colours. The word lists of
the wording rules stay beside the rules in design/wording.py and
design/restyle.py, since they are read only there. Every name is imported here
as well, so a step reads `from config import NAME`.
"""

from config.paths import (  # noqa: F401
    ASSETS, BRAND, DOCS, HERE, LOCKUP, LOGOS, MARK, REPO, SOURCE, TOKENS,
)
from config.pages import (  # noqa: F401
    BORDER, CONTRAST_EXCEPTIONS, DARK_LETTERING, DEPLOY_COPIES, DISPLAY_WIDTH, EXPORT_WIDTH,
    FREE_FORM, LAYOUT_EXCEPTIONS, LIGHT_ONLY, LOGO_PAGES, MIN_TEXT_PX, NETWORK_ICON, NO_MARK,
    SEQUENCE_DIAGRAMS, WHITE_VERSIONS,
)
from config.theme import (  # noqa: F401
    ACCENT, ACCENT_DARK, ACCENT_TINT, COLOURS, DARK_TEXT, DATA_TINT, ERROR, ERROR_TINT,
    GREY_100, GREY_400, GREY_50, GREY_600, GREY_700, LIGHT_BLUE_LINE, LIGHT_LINE, LIGHT_TEXT,
    MARK_ACCENT, PRIMARY, PRIMARY_DARK, PRIMARY_TINT, RGB, SLATE, token, WHITE,
)
