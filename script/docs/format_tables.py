"""Format markdown tables to have consistent column widths."""

import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class _TableState:
    """State for tracking table boundaries during parsing."""

    in_table: bool = False
    start_line: int = 0


def _is_table_row(line: str) -> bool:
    """Check if a line is part of a markdown table."""
    return "|" in line and line.strip().startswith("|")


def find_tables(content: str) -> list[tuple[int, int]]:
    """Find all table ranges in markdown content.

    Returns:
        List of (start_line, end_line) tuples (0-indexed)
    """
    lines = content.split("\n")
    tables = []
    state = _TableState()

    for i, line in enumerate(lines):
        is_table = _is_table_row(line)

        if is_table and not state.in_table:
            state.in_table = True
            state.start_line = i
        elif not is_table and state.in_table:
            tables.append((state.start_line, i - 1))
            state.in_table = False

    if state.in_table:
        tables.append((state.start_line, len(lines) - 1))

    return tables


def _parse_table_cells(line: str) -> list[str]:
    """Parse a table line into cells."""
    cells = [cell.strip() for cell in line.split("|")]
    # Remove empty first/last cells from leading/trailing pipes
    if cells and not cells[0]:
        cells = cells[1:]
    if cells and not cells[-1]:
        cells = cells[:-1]
    return cells


def _is_alignment_row(cell: str) -> bool:
    """Check if a cell is part of an alignment row."""
    return bool(re.match(r"^:?-+:?$", cell))


def _format_alignment_cell(cell: str, width: int) -> str:
    """Format an alignment cell with proper width."""
    left_align = cell.startswith(":")
    right_align = cell.endswith(":")
    dashes = "-" * width

    result = dashes
    if left_align and right_align:
        result = ":" + dashes[1:-1] + ":"
    elif left_align:
        result = ":" + dashes[1:]
    elif right_align:
        result = dashes[:-1] + ":"

    return result


def _calculate_column_widths(rows: list[list[str]], num_cols: int) -> list[int]:
    """Calculate maximum width for each column."""
    col_widths = [0] * num_cols

    for row in rows:
        for i in range(min(len(row), num_cols)):
            col_widths[i] = max(col_widths[i], len(row[i]))

    return col_widths


def _format_single_cell(cell: str, width: int) -> str:
    """Format a single cell based on type."""
    return (
        _format_alignment_cell(cell, width)
        if _is_alignment_row(cell)
        else cell.ljust(width)
    )


def _format_table_row(row: list[str], col_widths: list[int], num_cols: int) -> str:
    """Format a single table row."""
    cells = [
        _format_single_cell(row[i], col_widths[i])
        for i in range(min(len(row), num_cols))
    ]
    return "| " + " | ".join(cells) + " |"


def format_table(table_lines: list[str]) -> list[str]:
    """Format a table to have consistent column widths."""
    if not table_lines:
        return table_lines

    # Parse table rows
    rows = [_parse_table_cells(line) for line in table_lines]

    if not rows:
        return table_lines

    # Calculate max width for each column
    num_cols = len(rows[0])
    col_widths = _calculate_column_widths(rows, num_cols)

    # Format rows
    formatted_lines = [_format_table_row(row, col_widths, num_cols) for row in rows]

    return formatted_lines


def format_markdown_tables(content: str) -> str:
    """Format all tables in markdown content."""
    lines = content.split("\n")
    tables = find_tables(content)

    # Process tables in reverse order to preserve line numbers
    for start, end in reversed(tables):
        table_lines = lines[start : end + 1]
        formatted = format_table(table_lines)
        lines[start : end + 1] = formatted

    return "\n".join(lines)


def process_file(file_path: Path) -> bool:
    """Process a single markdown file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        formatted_content = format_markdown_tables(content)

        if content != formatted_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(formatted_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False


def main():
    """Main function to format tables in docs directory."""
    docs_dir = Path(__file__).parent.parent.parent / "docs"

    if not docs_dir.exists():
        print(f"Error: docs directory not found at {docs_dir}", file=sys.stderr)
        sys.exit(1)

    md_files = list(docs_dir.rglob("*.md"))
    modified_count = 0

    print(f"Found {len(md_files)} markdown files")

    for md_file in md_files:
        if process_file(md_file):
            modified_count += 1
            print(f"✓ Formatted: {md_file.relative_to(docs_dir)}")

    print(f"\nFormatted {modified_count} files")


if __name__ == "__main__":
    main()
