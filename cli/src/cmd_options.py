"""Click option decorators shared across the noun-group command modules.

Centralising the options reused verbatim by several commands (the installation
--output-dir and the --json status switch) keeps one definition per option
instead of copies drifting across cmd_platform.py / cmd_lifecycle.py /
cmd_user.py.
"""

import click

output_dir_option = click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)

json_option = click.option(
    "--json",
    "as_json",
    is_flag=True,
    help="Emit machine-readable JSON instead of a human-readable table.",
)

# Shared by the generation commands ('deployment generate' and the deprecated
# 'generate-project' shim), which write into a target directory rather than an
# existing installation.
target_dir_option = click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for generated files.",
)

force_option = click.option("--force", is_flag=True, help="Overwrite existing files.")
