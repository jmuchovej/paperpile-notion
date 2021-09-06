from functools import partial
from typing import List, Union, Dict

import click

def status(state: str, title: str) -> List:
    s = partial(click.style, bold=True)
    # fmt: off
    styles = {
        "update": s("Updated:", fg="blue"),
        "skip"  : s("Skipped:", fg="yellow"),
        "create": s("Created:", fg="green"),
        "failed": s("Failed:" , fg="red"),
    }
    # fmt: on

    click.echo(" ".join([styles[state], click.style(title, underline=True)]))


def summarize(db: str, bibtex: Union[List, Dict], notion: Union[List, Dict]) -> None:
    magenta = partial(click.style, fg="magenta")
    bold = partial(click.style, bold=True)

    n_bibtex = bold(len(bibtex))
    n_notion = bold(len(notion))
    summary = ["Found", n_bibtex, f"{db} in BibTeX and", n_notion, "on Notion."]
    click.echo(" ".join(map(magenta, summary)))
